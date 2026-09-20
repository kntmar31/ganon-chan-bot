import sharp from 'sharp'
import { AVATAR_GAP, AVATAR_SIZE } from '../../../src/features/smashRecruit/constants.js'
import { buildParticipantsImage, fetchImage } from '../../../src/features/smashRecruit/participantsImage.js'

/** 1画素の色(RGBA) */
interface Pixel {
  r: number
  g: number
  b: number
  a: number
}

/**
 * 単色の PNG を作る。ダミーのアイコン画像として使う。
 *
 * @param r - 赤(0〜255)
 * @param g - 緑(0〜255)
 * @param b - 青(0〜255)
 * @returns 128px 四方の PNG
 */
async function solidPng (r: number, g: number, b: number): Promise<Buffer> {
  return await sharp({ create: { width: 128, height: 128, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer()
}

/**
 * PNG の指定した位置の色を取り出す。
 *
 * @param png - PNG 画像
 * @param x - 左からの位置(px)
 * @param y - 上からの位置(px)
 * @returns その位置の色
 */
async function pixelAt (png: Buffer, x: number, y: number): Promise<Pixel> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const index = (y * info.width + x) * info.channels
  return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] }
}

/**
 * 枠 slot(0 始まり)の左端の位置を返す。
 *
 * @param slot - 枠の番号
 * @returns 左端の位置(px)
 */
function slotLeft (slot: number): number {
  return slot * (AVATAR_SIZE + AVATAR_GAP)
}

describe('buildParticipantsImage', () => {
  test('画像の大きさは、定員ぶんの枠と間隔から決まる', async () => {
    const image = await buildParticipantsImage([], 4)

    const { width, height, format } = await sharp(image).metadata()
    expect(width).toBe(4 * AVATAR_SIZE + 3 * AVATAR_GAP)
    expect(height).toBe(AVATAR_SIZE)
    expect(format).toBe('png')
  })

  test('参加者のアイコンが、その人の枠の中央に表示される', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)], 3)

    const center = await pixelAt(image, slotLeft(0) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    expect(center).toEqual({ r: 255, g: 0, b: 0, a: 255 })
  })

  test('参加した順に、左から横一列に並ぶ', async () => {
    const image = await buildParticipantsImage(
      [await solidPng(255, 0, 0), await solidPng(0, 255, 0), await solidPng(0, 0, 255)],
      3
    )

    const centers = await Promise.all([0, 1, 2].map(async (slot) =>
      await pixelAt(image, slotLeft(slot) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    ))
    expect(centers.map(({ r, g, b }) => [r, g, b])).toEqual([[255, 0, 0], [0, 255, 0], [0, 0, 255]])
  })

  test('アイコンは円形に切り抜かれ、四隅は透明になる', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)], 1)

    expect((await pixelAt(image, 1, 1)).a).toBe(0)
    expect((await pixelAt(image, AVATAR_SIZE - 2, AVATAR_SIZE - 2)).a).toBe(0)
  })

  test('枠と枠のあいだは透明', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)], 2)

    const gap = await pixelAt(image, AVATAR_SIZE + AVATAR_GAP / 2, AVATAR_SIZE / 2)
    expect(gap.a).toBe(0)
  })

  test('参加者のいない枠は、半透明のグレーの丸になる', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)], 2)

    const empty = await pixelAt(image, slotLeft(1) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    expect(empty.a).toBeGreaterThan(0)
    expect(empty.a).toBeLessThan(255)
    expect(empty.r).toBe(empty.g)
    expect(empty.g).toBe(empty.b)
  })

  test('アイコンを取得できなかった人(null)は、空き枠と同じ表示になる', async () => {
    const image = await buildParticipantsImage([null, await solidPng(255, 0, 0)], 3)

    const failed = await pixelAt(image, slotLeft(0) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    const empty = await pixelAt(image, slotLeft(2) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    expect(failed).toEqual(empty)
  })

  test('画像として読めないデータが渡されても、例外にせず空き枠と同じ表示になる', async () => {
    const image = await buildParticipantsImage([Buffer.from('これは画像ではない')], 2)

    const broken = await pixelAt(image, slotLeft(0) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    const empty = await pixelAt(image, slotLeft(1) + AVATAR_SIZE / 2, AVATAR_SIZE / 2)
    expect(broken).toEqual(empty)
  })

  test('定員より多いアイコンが渡されても、定員ぶんだけ並べる', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0), await solidPng(0, 255, 0)], 1)

    const { width } = await sharp(image).metadata()
    expect(width).toBe(AVATAR_SIZE)
  })
})

describe('fetchImage', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('ダウンロードした画像を、バッファで返す', async () => {
    const png = await solidPng(1, 2, 3)
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array(png)))

    const result = await fetchImage('https://cdn.example/avatar.png')

    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example/avatar.png')
    expect(result?.equals(png)).toBe(true)
  })

  test('HTTP エラーなら null を返す', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))

    await expect(fetchImage('https://cdn.example/missing.png')).resolves.toBeNull()
  })

  test('通信に失敗しても、例外にせず null を返す', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    await expect(fetchImage('https://cdn.example/avatar.png')).resolves.toBeNull()
  })
})

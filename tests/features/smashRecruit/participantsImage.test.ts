import { createServer } from 'node:http'
import sharp from 'sharp'
import {
  AVATAR_GAP,
  AVATAR_SIZE,
  AVATARS_PER_ROW
} from '../../../src/features/smashRecruit/constants.js'
import { buildParticipantsImage, fetchImage } from '../../../src/features/smashRecruit/participantsImage.js'

/** 1画素の色(RGBA) */
interface Pixel {
  r: number
  g: number
  b: number
  a: number
}

/** 1列ぶん(AVATARS_PER_ROW 人ぶん)の画像の幅。人数にかかわらず、画像の幅はこれに固定される */
const ROW_WIDTH = AVATARS_PER_ROW * AVATAR_SIZE + (AVATARS_PER_ROW - 1) * AVATAR_GAP

/**
 * 単色の PNG を作る。ダミーのアイコン画像として使う。
 *
 * @param r - 赤(0〜255)
 * @param g - 緑(0〜255)
 * @param b - 青(0〜255)
 * @returns 256px 四方の PNG
 */
async function solidPng (r: number, g: number, b: number): Promise<Buffer> {
  return await sharp({ create: { width: 256, height: 256, channels: 3, background: { r, g, b } } })
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
 * 参加者 index(0 始まり)のアイコンの中央の位置を返す。
 *
 * @param index - 参加者の番号(参加した順)
 * @returns 中央の位置(px)
 */
function centerOf (index: number): { x: number, y: number } {
  const column = index % AVATARS_PER_ROW
  const row = Math.floor(index / AVATARS_PER_ROW)
  return {
    x: column * (AVATAR_SIZE + AVATAR_GAP) + AVATAR_SIZE / 2,
    y: row * (AVATAR_SIZE + AVATAR_GAP) + AVATAR_SIZE / 2
  }
}

/**
 * 同じ色のダミーのアイコンを、指定した人数ぶん作る。
 *
 * @param count - 人数
 * @returns アイコン画像の配列
 */
async function redAvatars (count: number): Promise<Buffer[]> {
  const red = await solidPng(255, 0, 0)
  return Array.from({ length: count }, () => red)
}

describe('buildParticipantsImage', () => {
  test('参加者が1人もいなければ、画像は作れない(例外)', async () => {
    await expect(buildParticipantsImage([])).rejects.toThrow('1人以上')
  })

  test.each([1, 3, 8])('%i人なら、幅は常に1列ぶんで、高さは1段ぶん', async (count) => {
    const image = await buildParticipantsImage(await redAvatars(count))

    const { width, height, format } = await sharp(image).metadata()
    expect(width).toBe(ROW_WIDTH)
    expect(height).toBe(AVATAR_SIZE)
    expect(format).toBe('png')
  })

  test.each([
    [9, 2],
    [16, 2],
    [17, 3],
    [24, 3],
    [25, 4]
  ])('%i人なら、8人ごとに折り返して、%i段になる(幅は変わらない)', async (count, rows) => {
    const image = await buildParticipantsImage(await redAvatars(count))

    const { width, height } = await sharp(image).metadata()
    expect(width).toBe(ROW_WIDTH)
    expect(height).toBe(rows * AVATAR_SIZE + (rows - 1) * AVATAR_GAP)
  })

  test('空き枠は描かない(参加者のいない場所は透明のまま)', async () => {
    const image = await buildParticipantsImage(await redAvatars(2))

    for (const index of [2, 3, 7]) {
      const { x, y } = centerOf(index)
      expect((await pixelAt(image, x, y)).a).toBe(0)
    }
  })

  test('参加者のアイコンが、その人の場所の中央に表示される', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)])

    const { x, y } = centerOf(0)
    expect(await pixelAt(image, x, y)).toEqual({ r: 255, g: 0, b: 0, a: 255 })
  })

  test('参加した順に、左から横一列に並ぶ', async () => {
    const image = await buildParticipantsImage([
      await solidPng(255, 0, 0),
      await solidPng(0, 255, 0),
      await solidPng(0, 0, 255)
    ])

    const centers = await Promise.all([0, 1, 2].map(async (index) => {
      const { x, y } = centerOf(index)
      return await pixelAt(image, x, y)
    }))
    expect(centers.map(({ r, g, b }) => [r, g, b])).toEqual([[255, 0, 0], [0, 255, 0], [0, 0, 255]])
  })

  test('9人目は、次の段の左端に表示される', async () => {
    const avatars = await redAvatars(8)
    const image = await buildParticipantsImage([...avatars, await solidPng(0, 255, 0)])

    const ninth = centerOf(8)
    expect(ninth.x).toBe(AVATAR_SIZE / 2)
    expect(ninth.y).toBeGreaterThan(AVATAR_SIZE)
    expect(await pixelAt(image, ninth.x, ninth.y)).toEqual({ r: 0, g: 255, b: 0, a: 255 })
  })

  test('最後の段は左寄せで、右側は透明のまま', async () => {
    const image = await buildParticipantsImage(await redAvatars(9))

    const { x, y } = centerOf(9)
    expect((await pixelAt(image, x, y)).a).toBe(0)
  })

  test('アイコンは円形に切り抜かれ、四隅は透明になる', async () => {
    const image = await buildParticipantsImage([await solidPng(255, 0, 0)])

    expect((await pixelAt(image, 1, 1)).a).toBe(0)
    expect((await pixelAt(image, AVATAR_SIZE - 2, AVATAR_SIZE - 2)).a).toBe(0)
  })

  test('アイコンとアイコンのあいだは透明', async () => {
    const image = await buildParticipantsImage(await redAvatars(2))

    const gap = await pixelAt(image, AVATAR_SIZE + AVATAR_GAP / 2, AVATAR_SIZE / 2)
    expect(gap.a).toBe(0)
  })

  test('アイコンを取得できなかった人(null)は、半透明のグレーの丸になる', async () => {
    const image = await buildParticipantsImage([null])

    const { x, y } = centerOf(0)
    const placeholder = await pixelAt(image, x, y)
    expect(placeholder.a).toBeGreaterThan(0)
    expect(placeholder.a).toBeLessThan(255)
    expect(placeholder.r).toBe(placeholder.g)
    expect(placeholder.g).toBe(placeholder.b)
  })

  test('画像として読めないデータが渡されても、例外にせず、取得できなかった人と同じ表示になる', async () => {
    const image = await buildParticipantsImage([Buffer.from('これは画像ではない'), null])

    const broken = centerOf(0)
    const failed = centerOf(1)
    expect(await pixelAt(image, broken.x, broken.y)).toEqual(await pixelAt(image, failed.x, failed.y))
  })

  test('参加人数に上限はなく、大人数でも画像を作れる', async () => {
    const image = await buildParticipantsImage(await redAvatars(50))

    const { width, height } = await sharp(image).metadata()
    expect(width).toBe(ROW_WIDTH)
    expect(height).toBe(7 * AVATAR_SIZE + 6 * AVATAR_GAP)
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

    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example/avatar.png', expect.anything())
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

  test('応答が時間切れになっても、例外にせず null を返す(fetch が中断エラーを投げる場合)', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'))

    await expect(fetchImage('https://cdn.example/avatar.png')).resolves.toBeNull()
  })

  test('応答を待たずに中断できるよう、fetch に signal(AbortSignal)を渡す', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array()))

    await fetchImage('https://cdn.example/avatar.png')

    const options = fetchSpy.mock.calls[0][1] as { signal?: AbortSignal }
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  test('応答が、実際に約7秒で時間切れになる(応答しないサーバーに対して)', async () => {
    const server = createServer((_req, _res) => { /* 応答しないサーバー */ })
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('サーバーの起動に失敗しました')

    const start = Date.now()
    const result = await fetchImage(`http://127.0.0.1:${address.port}/avatar.png`)
    const elapsedMs = Date.now() - start

    server.close()

    expect(result).toBeNull()
    // 7000ms ちょうどでの誤差(実行環境の遅延)を許容する
    expect(elapsedMs).toBeGreaterThanOrEqual(6900)
    expect(elapsedMs).toBeLessThan(9000)
  }, 12000)
})

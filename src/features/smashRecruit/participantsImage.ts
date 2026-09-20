import sharp from 'sharp'
import { AVATAR_GAP, AVATAR_SIZE, AVATARS_PER_ROW } from './constants.js'

// アイコンを取得できなかった人の丸の色(ダークテーマでもライトテーマでも見えるよう、半透明のグレーにする)
const PLACEHOLDER_COLOR = 'rgba(128, 128, 128, 0.35)'

/**
 * 直径 AVATAR_SIZE の円の SVG を作る。アイコンを円形に切り抜くマスクと、アイコンを取得できなかった人の丸の描画に使う。
 *
 * @param fill - 塗りつぶしの色
 * @returns SVG のバッファ
 */
function circleSvg (fill: string): Buffer {
  const radius = AVATAR_SIZE / 2
  return Buffer.from(
    `<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="${fill}"/></svg>`
  )
}

/**
 * アイコン画像を、AVATAR_SIZE 四方の円形に切り抜く。
 *
 * @param avatar - アイコン画像(PNG / JPEG / WebP など)
 * @returns 円形に切り抜いた PNG。読み込めない画像なら null
 */
async function toCircle (avatar: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(avatar)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .ensureAlpha()
      .composite([{ input: circleSvg('#fff'), blend: 'dest-in' }])
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

/**
 * 参加者のアイコンを、名前なしで並べた画像を作る。
 * 1列に AVATARS_PER_ROW 人ずつ、左から右へ並べ、あふれたら次の列に折り返す(最後の列は左寄せ)。
 * 空き枠は描かないが、画像の幅は常に1列ぶん(AVATARS_PER_ROW 人ぶん)に固定する。
 * 人数が少なくても、Discord 上でのアイコンの大きさが変わらないようにするため(右側は透明のまま)。
 *
 * @param avatars - 参加者のアイコン画像(参加した順。1人以上)。取得できなかった人は null(灰色の丸で表示する)
 * @returns 背景が透明の PNG
 */
export async function buildParticipantsImage (avatars: ReadonlyArray<Buffer | null>): Promise<Buffer> {
  if (avatars.length === 0) throw new Error('参加者のアイコン画像を作るには、1人以上の参加者が必要です')

  const rows = Math.ceil(avatars.length / AVATARS_PER_ROW)
  const width = AVATARS_PER_ROW * AVATAR_SIZE + (AVATARS_PER_ROW - 1) * AVATAR_GAP
  const height = rows * AVATAR_SIZE + (rows - 1) * AVATAR_GAP
  const placeholder = circleSvg(PLACEHOLDER_COLOR)

  const overlays = await Promise.all(
    avatars.map(async (avatar, index) => {
      const circle = avatar !== null ? await toCircle(avatar) : null
      return {
        input: circle ?? placeholder,
        left: (index % AVATARS_PER_ROW) * (AVATAR_SIZE + AVATAR_GAP),
        top: Math.floor(index / AVATARS_PER_ROW) * (AVATAR_SIZE + AVATAR_GAP)
      }
    })
  )

  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(overlays)
    .png()
    .toBuffer()
}

/**
 * URL から画像をダウンロードする。
 *
 * @param url - 画像の URL
 * @returns 画像のバッファ。取得に失敗したときは null(参加者のアイコンが取れなくても、投稿全体は失敗させない)
 */
export async function fetchImage (url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null
  }
}

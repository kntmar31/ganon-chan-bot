import { POSTER_LINE_PREFIX } from './constants.js'

/** 「・募集した人：<@ユーザーID>」の行にあてはまるか判定する正規表現 */
const POSTER_LINE = new RegExp(`^${POSTER_LINE_PREFIX}<@!?(\\d+)>$`)

/**
 * 募集メッセージの「募集した人」の行を作る。
 *
 * @param userMention - 募集した人のメンション(<@ユーザーID>)
 * @returns 「・募集した人：<@ユーザーID>」の行
 */
export function buildPosterLine (userMention: string): string {
  return `${POSTER_LINE_PREFIX}${userMention}`
}

/**
 * 募集メッセージの本文から、募集した人のユーザー ID を読み取る。
 * 募集文(投稿者が自由に書ける)が、同じ形の行を含んでいても惑わされないよう、
 * 募集文より後ろにある本物の行を採用する(最後に見つかった行)。
 *
 * @param content - メッセージの本文
 * @returns 募集した人のユーザー ID。募集メッセージでない(または、書き換え済みの)場合は undefined
 */
export function parsePosterId (content: string | null | undefined): string | undefined {
  if (content === null || content === undefined) return undefined

  for (const line of content.split('\n').reverse()) {
    const match = POSTER_LINE.exec(line)
    if (match !== null) return match[1]
  }
  return undefined
}

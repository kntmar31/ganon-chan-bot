import type { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js'
import { defineEvent } from '../../types.js'
import { runExclusive } from '../../utils/keyedLock.js'
import { END_EMOJIS } from './constants.js'
import { parsePosterId } from './poster.js'

/** リアクションの絵文字のうち、判定に使う部分 */
export interface ReactionEmoji {
  id: string | null
  name: string | null
}

/** 絵文字の ID の項目にあてはまる正規表現(ID の数字だけ、または、絵文字を送信したときの表記 <:名前:ID>) */
const EMOJI_ID_TOKEN = /^(?:<a?:\w+:)?(\d+)>?$/

/**
 * カンマ区切りの設定値を、前後の空白を除いた項目に分ける。空の項目は含めない。
 *
 * @param value - 設定値(未設定なら undefined)
 * @returns 項目の一覧
 */
function splitTokens (value: string | undefined): string[] {
  if (value === undefined) return []
  return value.split(',').map((token) => token.trim()).filter((token) => token !== '')
}

/**
 * 標準の絵文字の名前から、表記のゆれ(絵文字として表示するための異体字セレクタ)を取り除く。
 *
 * @param name - 絵文字の名前
 * @returns 表記のゆれを取り除いた名前
 */
function normalizeEmojiName (name: string | null): string {
  return (name ?? '').replace(/\uFE0F/g, '')
}

/**
 * 環境変数(RECRUIT_END_EMOJI_ID)の値から、サーバー独自の絵文字の ID の一覧を取り出す。
 * カンマで区切って、複数指定できる。ID の数字だけでなく、絵文字を送信したときの表記(<:名前:ID>)でも受け付ける。
 * 空の項目や、読み取れない項目は、無視する。
 *
 * @param value - 環境変数の値(未設定なら undefined)
 * @returns 絵文字の ID の一覧
 */
export function parseEmojiIds (value: string | undefined): string[] {
  return splitTokens(value)
    .map((token) => EMOJI_ID_TOKEN.exec(token)?.[1])
    .filter((id): id is string => id !== undefined)
}

/**
 * 環境変数(RECRUIT_END_EMOJI_ID)の値のうち、絵文字の ID として読み取れない項目を返す。
 * 区切りを間違えたときなどに、無視されていることに気づけるよう、起動時の警告に使う。
 *
 * @param value - 環境変数の値(未設定なら undefined)
 * @returns 読み取れない項目の一覧(空の項目は含まない)
 */
export function findInvalidEmojiTokens (value: string | undefined): string[] {
  return splitTokens(value).filter((token) => !EMOJI_ID_TOKEN.test(token))
}

/**
 * リアクションの絵文字が、募集を書き換える絵文字かどうかを判定する。
 * 標準の絵文字は END_EMOJIS、サーバー独自の絵文字は、指定された ID のものだけが、あてはまる。
 *
 * @param emoji - リアクションの絵文字
 * @param customEmojiIds - 書き換える絵文字として指定された、サーバー独自の絵文字の ID の一覧
 * @returns 書き換える絵文字なら true
 */
export function isEndEmoji (emoji: ReactionEmoji, customEmojiIds: readonly string[]): boolean {
  if (emoji.id !== null) return customEmojiIds.includes(emoji.id)
  const name = normalizeEmojiName(emoji.name)
  return END_EMOJIS.some((endEmoji) => normalizeEmojiName(endEmoji) === name)
}

/**
 * 募集メッセージに、募集した人が、決めた絵文字のリアクションを付けたら、
 * メッセージの内容を、その絵文字だけに書き換える(元には戻せない)。
 * 参加者のアイコン画像とボタンも外し、その投稿に付いているリアクションもすべて外す。
 * それ以外の人や、それ以外の絵文字には、何もしない。
 *
 * @param reaction - 付いたリアクション
 * @param user - リアクションを付けた人
 */
export async function handleReactionAdd (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
): Promise<void> {
  // Bot 自身や、他の Bot のリアクションには反応しない
  if (user.bot) return
  // 取得や排他制御をする前に、無関係な絵文字を弾く
  if (!isEndEmoji(reaction.emoji, parseEmojiIds(process.env.RECRUIT_END_EMOJI_ID))) return

  // 参加ボタンの処理と同じ投稿を、同時に書き換えて、上書きし合わないよう、投稿ごとに順番に処理する
  await runExclusive(reaction.message.id, async () => {
    // Bot の再起動前の投稿などは、内容が空の状態で届くため、最新の内容を取得する(「メッセージ履歴を読む」権限が必要)
    const message = await reaction.message.fetch()

    // Bot 自身の募集メッセージで、募集した人が付けたときだけ書き換える
    if (message.author.id !== message.client.user.id) return
    if (parsePosterId(message.content) !== user.id) return

    await message.edit({ content: reaction.emoji.toString(), attachments: [], components: [] })

    // 書き換えた投稿に、リアクションを残さない(募集した人が付けたものも、他の人が付けたものも、すべて外す)。
    // 外せなくても、書き換えは済んでいるため、原因が分かる警告を出すだけにする
    try {
      await message.reactions.removeAll()
    } catch (error) {
      console.warn(
        '[警告] 募集メッセージを書き換えましたが、リアクションを外せませんでした。' +
        'Bot のロールに「メッセージの管理」権限が必要です',
        error
      )
    }
  })
}

export const reactionAddHandler = defineEvent('messageReactionAdd', handleReactionAdd)

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
 * リアクションの絵文字が、募集を書き換える絵文字かどうかを判定する。
 * 標準の絵文字は END_EMOJIS、サーバー独自の絵文字は、指定された ID のものだけが、あてはまる。
 *
 * @param emoji - リアクションの絵文字
 * @param customEmojiId - 書き換える絵文字として指定された、サーバー独自の絵文字の ID(未指定なら undefined)
 * @returns 書き換える絵文字なら true
 */
export function isEndEmoji (emoji: ReactionEmoji, customEmojiId: string | undefined): boolean {
  if (emoji.id !== null) {
    return customEmojiId !== undefined && customEmojiId !== '' && emoji.id === customEmojiId
  }
  const name = normalizeEmojiName(emoji.name)
  return END_EMOJIS.some((endEmoji) => normalizeEmojiName(endEmoji) === name)
}

/**
 * 募集メッセージに、募集した人が、決めた絵文字のリアクションを付けたら、
 * メッセージの内容を、その絵文字だけに書き換える(元には戻せない)。
 * 参加者のアイコン画像とボタンも外す。それ以外の人や、それ以外の絵文字には、何もしない。
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
  if (!isEndEmoji(reaction.emoji, process.env.RECRUIT_END_EMOJI_ID)) return

  // 参加ボタンの処理と同じ投稿を、同時に書き換えて、上書きし合わないよう、投稿ごとに順番に処理する
  await runExclusive(reaction.message.id, async () => {
    // Bot の再起動前の投稿などは、内容が空の状態で届くため、最新の内容を取得する(「メッセージ履歴を読む」権限が必要)
    const message = await reaction.message.fetch()

    // Bot 自身の募集メッセージで、募集した人が付けたときだけ書き換える
    if (message.author.id !== message.client.user.id) return
    if (parsePosterId(message.content) !== user.id) return

    await message.edit({ content: reaction.emoji.toString(), attachments: [], components: [] })
  })
}

export const reactionAddHandler = defineEvent('messageReactionAdd', handleReactionAdd)

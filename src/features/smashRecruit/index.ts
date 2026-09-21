import { GatewayIntentBits, Partials } from 'discord.js'
import type { Feature } from '../../types.js'
import command from './command.js'
import components from './components.js'
import { findInvalidEmojiTokens, reactionAddHandler } from './reactions.js'

// 設定の書き間違い(区切りをカンマにしていない、など)で、絵文字が無視されていることに気づけるよう、起動時に警告する
const invalidEmojiTokens = findInvalidEmojiTokens(process.env.RECRUIT_END_EMOJI_ID)
if (invalidEmojiTokens.length > 0) {
  console.warn(`[警告] RECRUIT_END_EMOJI_ID に、絵文字の ID として読み取れない値があります(無視します): ${invalidEmojiTokens.join(' / ')}`)
}

// features/index.ts のローダーがこの形式（{ commands, components, events, intents, partials }）を期待する。
// 新しい機能を作るときも、同じ形でexport defaultすればよい(使わない項目は省略できる)。
const feature: Feature = {
  commands: [command],
  components,
  events: [reactionAddHandler],
  // リアクションの追加を受け取るために必要(特権の許可は不要)
  intents: [GatewayIntentBits.GuildMessageReactions],
  // Bot の再起動前の投稿など、キャッシュにない投稿へのリアクションも受け取るために必要
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User]
}

export default feature

import { GatewayIntentBits, Partials } from 'discord.js'
import type { Feature } from '../../types.js'
import command from './command.js'
import components from './components.js'
import { reactionAddHandler } from './reactions.js'

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

import { Client, GatewayIntentBits, Collection, ActivityType, Events, MessageFlags } from 'discord.js'
import type { Interaction, InteractionReplyOptions } from 'discord.js'
import dotenv from 'dotenv'
import { loadFeatures } from './features/index.js'
import { BOT_NAME } from './config.js'
import type { Command, Component } from './types.js'

dotenv.config()

const token = process.env.DISCORD_TOKEN

if (token === undefined || token === '') {
  console.error('.env に DISCORD_TOKEN を設定してください。')
  process.exit(1)
}

// Client に必要なインテントと partials は、各機能が必要とするものを足し合わせて決めるため、先に機能を読み込む
const { commands, components, events, intents, partials } = await loadFeatures()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, ...intents],
  partials
})

// customIdが重複していないかここで検知しておく（機能追加時の事故防止）
const commandMap = new Collection<string, Command>(commands.map((command) => [command.data.name, command]))
const componentMap = new Collection<string, Component>(components.map((component) => [component.customId, component]))

// 各機能が受け取るイベント(リアクションが付いた、など)を登録する。
// ハンドラ内で例外が起きても、ログに出力するだけで、Bot 全体は止めない
for (const handler of events) {
  client.on(handler.event, (...args) => {
    handler.execute(...args).catch((error: unknown) => {
      console.error(`イベント「${handler.event}」の処理でエラーが発生しました`, error)
    })
  })
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`${BOT_NAME} が起動しました（アカウント: ${readyClient.user.tag}）`)
  console.log(`読み込んだコマンド: ${[...commandMap.keys()].join(', ')}`)
  if (events.length > 0) console.log(`読み込んだイベント: ${[...new Set(events.map((handler) => handler.event))].join(', ')}`)

  readyClient.user.setActivity(`${BOT_NAME}稼働中`, { type: ActivityType.Watching })
})

/**
 * インタラクション(コマンド・ボタン・セレクトメニュー・モーダル)を該当のハンドラへ振り分ける。
 * ハンドラ内で例外が起きた場合は、ユーザーにエラーを通知する。
 *
 * @param interaction - 受信したインタラクション
 */
async function handleInteraction (interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandMap.get(interaction.commandName)
      if (command === undefined) return
      await command.execute(interaction)
      return
    }

    // ボタン・セレクトメニュー・モーダルはすべてcustomIdで一元的に振り分ける
    if (interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
      const component = componentMap.get(interaction.customId)
      if (component === undefined) return
      await component.execute(interaction)
    }
  } catch (error) {
    console.error(error)
    if (interaction.isRepliable()) {
      const payload: InteractionReplyOptions = { content: 'エラーが発生しました。もう一度お試しください。', flags: MessageFlags.Ephemeral }
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {})
      } else {
        await interaction.reply(payload).catch(() => {})
      }
    }
  }
}

client.on(Events.InteractionCreate, (interaction) => {
  void handleInteraction(interaction)
})

await client.login(token)

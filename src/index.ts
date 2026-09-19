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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

const { commands, components } = await loadFeatures()

// customIdが重複していないかここで検知しておく（機能追加時の事故防止）
const commandMap = new Collection<string, Command>(commands.map((command) => [command.data.name, command]))
const componentMap = new Collection<string, Component>(components.map((component) => [component.customId, component]))

client.once(Events.ClientReady, (readyClient) => {
  console.log(`${BOT_NAME} が起動しました（アカウント: ${readyClient.user.tag}）`)
  console.log(`読み込んだコマンド: ${[...commandMap.keys()].join(', ')}`)

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

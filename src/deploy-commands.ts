// 全機能のスラッシュコマンドを自動収集して Discord に登録する。
// 実行: npm run deploy-commands（ビルド後の dist/deploy-commands.js を実行する）

import { REST, Routes } from 'discord.js'
import dotenv from 'dotenv'
import { loadFeatures } from './features/index.js'

dotenv.config()

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env

if (
  DISCORD_TOKEN === undefined || DISCORD_TOKEN === '' ||
  CLIENT_ID === undefined || CLIENT_ID === '' ||
  GUILD_ID === undefined || GUILD_ID === ''
) {
  console.error(
    '.env に DISCORD_TOKEN / CLIENT_ID / GUILD_ID を設定してください。'
  )
  process.exit(1)
}

const { commands } = await loadFeatures()
const body = commands.map((command) => command.data.toJSON())

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)

try {
  console.log(`スラッシュコマンドを登録中... (${body.length}件: ${commands.map((c) => c.data.name).join(', ')})`)

  // ギルド（サーバー）限定登録：即時反映されるので開発中はこちらが便利
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body })

  console.log('スラッシュコマンドの登録が完了しました。')
} catch (error) {
  console.error(error)
}

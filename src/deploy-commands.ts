// 全機能のスラッシュコマンドを自動収集して Discord に登録する。
// 実行: npm run deploy-commands（ビルド後の dist/deploy-commands.js を実行する）
//
// 登録先は GUILD_ID で決まる。
//   - GUILD_ID を指定する: そのサーバーだけに登録する（すぐ反映される。開発中向き）
//   - GUILD_ID を空にする: Bot を入れたすべてのサーバーで使えるように、全サーバー共通で登録する（本番向き）

import { REST } from 'discord.js'
import dotenv from 'dotenv'
import { loadFeatures } from './features/index.js'
import { resolveDeployTarget } from './utils/deployTarget.js'

dotenv.config()

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env

if (
  DISCORD_TOKEN === undefined || DISCORD_TOKEN === '' ||
  CLIENT_ID === undefined || CLIENT_ID === ''
) {
  console.error(
    '.env に DISCORD_TOKEN / CLIENT_ID を設定してください（GUILD_ID は任意。空なら全サーバー共通で登録します）。'
  )
  process.exit(1)
}

const target = resolveDeployTarget(CLIENT_ID, GUILD_ID)

const { commands } = await loadFeatures()
const body = commands.map((command) => command.data.toJSON())

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN)

try {
  console.log(`スラッシュコマンドを登録中... (${body.length}件: ${commands.map((c) => c.data.name).join(', ')})`)
  console.log(`登録先: ${target.description}`)

  await rest.put(target.route, { body })

  console.log('スラッシュコマンドの登録が完了しました。')
} catch (error) {
  console.error(error)
  // 登録に失敗したら非ゼロで終了する（npm run dev のように後続のコマンドとつないでも、失敗に気づけるようにする）
  process.exitCode = 1
}

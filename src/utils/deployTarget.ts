import { Routes } from 'discord.js'

/** スラッシュコマンドの登録先 */
export interface DeployTarget {
  /** Discord API のパス(PUT でコマンドの一覧を登録する先) */
  route: `/${string}`
  /** 登録先を説明する文言(ログ用) */
  description: string
}

/**
 * スラッシュコマンドの登録先を決める。
 * GUILD_ID が指定されていれば、そのサーバーだけに登録する(すぐ反映されるので、開発中に向いている)。
 * 空(または未指定)なら、Bot を入れたすべてのサーバーで使える、全サーバー共通で登録する(本番向き。反映に時間がかかることがある)。
 *
 * @param clientId - Bot のアプリケーション ID(CLIENT_ID)
 * @param guildId - 登録先のサーバー ID(GUILD_ID。未指定・空・空白だけなら、全サーバー共通)
 * @returns 登録先
 */
export function resolveDeployTarget (clientId: string, guildId: string | undefined): DeployTarget {
  const guild = guildId?.trim() ?? ''

  if (guild !== '') {
    return {
      route: Routes.applicationGuildCommands(clientId, guild),
      description: `サーバー限定(GUILD_ID=${guild})`
    }
  }

  return {
    route: Routes.applicationCommands(clientId),
    description: '全サーバー共通(GUILD_ID が空のため)'
  }
}

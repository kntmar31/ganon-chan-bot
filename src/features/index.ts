// src/features/ 配下の各フォルダを機能単位として自動的に読み込む。
// 新しい機能を追加するときは、ここを書き換える必要はなく、
// フォルダを1つ増やして index.ts を export default { commands, components, events, ... } の形で書けばよい。
//
// 注意：実行時に読み込むのはビルド後の dist/features/<機能名>/index.js。
// そのため、起動前に `npm run build` が必要。

import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { GatewayIntentBits, Partials } from 'discord.js'
import type { Command, Component, EventHandler, Feature } from '../types.js'

const featuresDir = path.dirname(fileURLToPath(import.meta.url))

/** 全機能をまとめた読み込み結果 */
export interface LoadedFeatures {
  commands: Command[]
  components: Component[]
  events: EventHandler[]
  /** 全機能が必要とするゲートウェイインテント(重複は除いてある) */
  intents: GatewayIntentBits[]
  /** 全機能が必要とする partials(重複は除いてある) */
  partials: Partials[]
}

/**
 * features 配下の全機能を読み込み、コマンド・コンポーネント・イベント処理などを1つにまとめて返す。
 *
 * @returns 全機能のスラッシュコマンド、コンポーネントのハンドラ、イベント処理、必要なインテントと partials
 */
export async function loadFeatures (): Promise<LoadedFeatures> {
  const commands: Command[] = []
  const components: Component[] = []
  const events: EventHandler[] = []
  const intents = new Set<GatewayIntentBits>()
  const partials = new Set<Partials>()

  const entries = readdirSync(featuresDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  )

  for (const entry of entries) {
    const indexPath = path.join(featuresDir, entry.name, 'index.js')
    const { default: feature } = await import(pathToFileURL(indexPath).href) as { default?: Feature }

    if (feature === undefined) {
      console.warn(`[警告] features/${entry.name} に default export がありません`)
      continue
    }

    if (feature.commands !== undefined) commands.push(...feature.commands)
    if (feature.components !== undefined) components.push(...feature.components)
    if (feature.events !== undefined) events.push(...feature.events)
    feature.intents?.forEach((intent) => intents.add(intent))
    feature.partials?.forEach((partial) => partials.add(partial))
  }

  return { commands, components, events, intents: [...intents], partials: [...partials] }
}

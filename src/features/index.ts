// src/features/ 配下の各フォルダを機能単位として自動的に読み込む。
// 新しい機能を追加するときは、ここを書き換える必要はなく、
// フォルダを1つ増やして index.ts を export default { commands, components } の形で書けばよい。
//
// 注意：実行時に読み込むのはビルド後の dist/features/<機能名>/index.js。
// そのため、起動前に `npm run build` が必要。

import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Command, Component, Feature } from '../types.js'

const featuresDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * features 配下の全機能を読み込み、コマンドとコンポーネントを1つにまとめて返す。
 *
 * @returns 全機能のスラッシュコマンドとコンポーネントのハンドラ
 */
export async function loadFeatures (): Promise<{ commands: Command[], components: Component[] }> {
  const commands: Command[] = []
  const components: Component[] = []

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
  }

  return { commands, components }
}

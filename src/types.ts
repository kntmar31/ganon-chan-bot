// 機能(features)をまたいで共有する型定義。

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  SharedSlashCommand,
  StringSelectMenuInteraction
} from 'discord.js'

/** スラッシュコマンド1件分の定義 */
export interface Command {
  /** コマンドの定義(名前・説明・オプション) */
  data: SharedSlashCommand
  /** コマンド実行時の処理 */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

/** customId で振り分けるコンポーネント系インタラクション */
export type ComponentInteraction =
  | StringSelectMenuInteraction
  | ButtonInteraction
  | ModalSubmitInteraction

/** セレクトメニュー・ボタン・モーダルのハンドラ1件分の定義 */
export interface Component<T extends ComponentInteraction = ComponentInteraction> {
  /** 一意な customId("機能名:アクション名" で統一する) */
  customId: string
  /** インタラクション受信時の処理 */
  execute: (interaction: T) => Promise<void>
}

/** 1機能フォルダの index.ts が default export する形式 */
export interface Feature {
  commands?: Command[]
  components?: Component[]
}

/**
 * 個別のインタラクション型に絞ったハンドラを、customId で一元管理する Component として扱えるようにする。
 * customId は機能ごとに一意なので、実行時に別種のインタラクションが渡されることはない。
 * そのため、ここで1か所だけ型を広げる(キャストする)。
 *
 * @param component - 特定のインタラクション型に絞ったハンドラ
 * @returns customId で振り分けできる Component
 */
export function defineComponent<T extends ComponentInteraction> (component: Component<T>): Component {
  return component as unknown as Component
}

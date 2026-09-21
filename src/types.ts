// 機能(features)をまたいで共有する型定義。

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  GatewayIntentBits,
  ModalSubmitInteraction,
  Partials,
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

/** Client のイベント(リアクションが付いた、など)を受け取る処理1件分の定義 */
export interface EventHandler {
  /** 受け取るイベントの名前(discord.js の Events) */
  event: keyof ClientEvents
  /** イベント受信時の処理。例外が起きても Bot 全体は止まらず、ログに出力される */
  execute: (...args: unknown[]) => Promise<void>
}

/** 1機能フォルダの index.ts が default export する形式 */
export interface Feature {
  commands?: Command[]
  components?: Component[]
  /** この機能が受け取るイベントの処理 */
  events?: EventHandler[]
  /** この機能のイベントを受け取るために必要なゲートウェイインテント(Bot 全体の分に足される) */
  intents?: GatewayIntentBits[]
  /** キャッシュにないデータ(Bot の再起動前の投稿など)のイベントを受け取るために必要な partials */
  partials?: Partials[]
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

/**
 * 特定のイベントの引数に絞ったハンドラを、機能をまたいで一元管理する EventHandler として扱えるようにする。
 * 登録するイベントの名前と引数は、event で決まるため、実行時に別の引数が渡されることはない。
 * そのため、ここで1か所だけ型を広げる(キャストする)。
 *
 * @param event - 受け取るイベントの名前
 * @param execute - イベント受信時の処理
 * @returns 一元管理できる EventHandler
 */
export function defineEvent<E extends keyof ClientEvents> (
  event: E,
  execute: (...args: ClientEvents[E]) => Promise<void>
): EventHandler {
  return { event, execute: execute as unknown as EventHandler['execute'] }
}

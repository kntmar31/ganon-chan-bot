import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js'
import { CUSTOM_IDS, MODE_LABELS, TOGGLE_LABELS } from './constants.js'
import { isComplete } from './types.js'
import type { RecruitDraft } from './types.js'

/**
 * 現在の選択状況を表すメッセージ本文を組み立てる。
 *
 * @param state - 入力途中の状態
 * @returns 選択状況を含むメッセージ本文
 */
export function buildStatusLine (state: RecruitDraft): string {
  const mode = state.mode !== undefined ? MODE_LABELS[state.mode] : '未選択'
  const gimmick = state.gimmick !== undefined ? TOGGLE_LABELS[state.gimmick] : '未選択'
  const item = state.item !== undefined ? TOGGLE_LABELS[state.item] : '未選択'

  return [
    '**スマブラ募集の条件を選んでください**',
    `・対戦形式：${mode}`,
    `・ステージギミック：${gimmick}`,
    `・アイテム：${item}`,
    '',
    '3項目すべて選択すると「募集文を入力して投稿」が押せるようになります。'
  ].join('\n')
}

/**
 * セレクトメニュー3つとボタン2つの行を組み立てる。
 * 選択済みの項目は default 指定にして、選択状態を画面に反映する。
 *
 * @param state - 入力途中の状態
 * @returns メッセージに添付するコンポーネント行
 */
export function buildComponents (
  state: RecruitDraft
): Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>> {
  const modeSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_MODE)
    .setPlaceholder('対戦形式を選択')
    .addOptions(
      Object.entries(MODE_LABELS).map(([value, label]) => ({
        value,
        label,
        default: state.mode === value
      }))
    )

  const gimmickSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_GIMMICK)
    .setPlaceholder('ステージギミックの有無を選択')
    .addOptions(
      Object.entries(TOGGLE_LABELS).map(([value, label]) => ({
        value,
        label: `ギミック${label}`,
        default: state.gimmick === value
      }))
    )

  const itemSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_ITEM)
    .setPlaceholder('アイテムの有無を選択')
    .addOptions(
      Object.entries(TOGGLE_LABELS).map(([value, label]) => ({
        value,
        label: `アイテム${label}`,
        default: state.item === value
      }))
    )

  // 3項目すべて選択済みのときだけ、投稿ボタンを押せるようにする
  const submitButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.SUBMIT_BUTTON)
    .setLabel('募集文を入力して投稿')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!isComplete(state))

  const cancelButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.CANCEL_BUTTON)
    .setLabel('キャンセル')
    .setStyle(ButtonStyle.Secondary)

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gimmickSelect),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelect),
    new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton, cancelButton)
  ]
}

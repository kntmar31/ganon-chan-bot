import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { CUSTOM_IDS, DEFAULT_SELECTION, MODE_LABELS, TOGGLE_LABELS } from './constants.js'

/**
 * 選択肢のラベル定義から、必須のラジオグループを組み立てる。
 * デフォルト値が最初から選択されており、送信時には必ず1つ選ばれている。
 *
 * @param customId - ラジオグループの customId
 * @param labels - 選択肢(キー: 内部で使う値、値: 画面に表示するラベル)
 * @param defaultValue - 最初から選択しておく値
 * @returns ラジオグループ
 */
function buildRadioGroup (
  customId: string,
  labels: Record<string, string>,
  defaultValue: string
): RadioGroupBuilder {
  return new RadioGroupBuilder()
    .setCustomId(customId)
    .setRequired(true)
    .addOptions(
      Object.entries(labels).map(([value, label]) => ({ value, label, default: value === defaultValue }))
    )
}

/**
 * 募集内容を入力するモーダル(ポップアップ)を組み立てる。
 * 対戦形式・ステージギミック・アイテムをラジオ選択し、募集文は任意で入力する。
 *
 * @returns 募集内容の入力モーダル
 */
export function buildRecruitModal (): ModalBuilder {
  const modeLabel = new LabelBuilder()
    .setLabel('対戦形式')
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_MODE, MODE_LABELS, DEFAULT_SELECTION.mode))

  const gimmickLabel = new LabelBuilder()
    .setLabel('ステージギミック')
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_GIMMICK, TOGGLE_LABELS, DEFAULT_SELECTION.gimmick))

  const itemLabel = new LabelBuilder()
    .setLabel('アイテム')
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_ITEM, TOGGLE_LABELS, DEFAULT_SELECTION.item))

  const textLabel = new LabelBuilder()
    .setLabel('募集文（未入力でも投稿できます）')
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_TEXT_INPUT)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300)
        .setPlaceholder('例：初心者歓迎！20時から2時間くらい遊びます')
    )

  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL)
    .setTitle('スマブラ募集')
    .addLabelComponents(modeLabel, gimmickLabel, itemLabel, textLabel)
}

/**
 * 募集メッセージに付ける「参加 / 取消」ボタンの行を組み立てる。
 * 参加していない人が押すと参加、参加済みの人が押すと取り消しになる。
 *
 * @returns ボタンを1つ含むコンポーネント行
 */
export function buildJoinRow (): ActionRowBuilder<ButtonBuilder> {
  const joinButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.JOIN_BUTTON)
    .setLabel('参加 / 取消')
    .setStyle(ButtonStyle.Success)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton)
}

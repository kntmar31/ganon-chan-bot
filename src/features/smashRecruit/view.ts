import {
  LabelBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import { CUSTOM_IDS, MODE_LABELS, TOGGLE_LABELS } from './constants.js'

/**
 * 選択肢のラベル定義から、必須のラジオグループを組み立てる。
 * 未選択のままでは送信できないため、送信時には必ず1つ選ばれている。
 *
 * @param customId - ラジオグループの customId
 * @param labels - 選択肢(キー: 内部で使う値、値: 画面に表示するラベル)
 * @returns ラジオグループ
 */
function buildRadioGroup (customId: string, labels: Record<string, string>): RadioGroupBuilder {
  return new RadioGroupBuilder()
    .setCustomId(customId)
    .setRequired(true)
    .addOptions(Object.entries(labels).map(([value, label]) => ({ value, label })))
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
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_MODE, MODE_LABELS))

  const gimmickLabel = new LabelBuilder()
    .setLabel('ステージギミック')
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_GIMMICK, TOGGLE_LABELS))

  const itemLabel = new LabelBuilder()
    .setLabel('アイテム')
    .setRadioGroupComponent(buildRadioGroup(CUSTOM_IDS.MODAL_ITEM, TOGGLE_LABELS))

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

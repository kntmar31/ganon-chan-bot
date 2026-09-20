import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CheckboxGroupBuilder,
  LabelBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import {
  CUSTOM_IDS,
  DEFAULT_SELECTION,
  MODE_LABELS,
  OPTION_CHECKBOXES,
  START_TIME_LABELS
} from './constants.js'

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

  // 何もチェックしない(どちらも「なし」)状態でも送信できるよう、必須にせず、最小の選択数を 0 にする
  const optionsLabel = new LabelBuilder()
    .setLabel('ステージギミック・アイテム')
    .setDescription('チェックしたものが「あり」になります(チェックなしは「なし」)')
    .setCheckboxGroupComponent(
      new CheckboxGroupBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_OPTIONS)
        .setRequired(false)
        .setMinValues(0)
        .addOptions(
          (['gimmick', 'item'] as const).map((field) => ({
            value: OPTION_CHECKBOXES[field].value,
            label: OPTION_CHECKBOXES[field].label,
            default: (DEFAULT_SELECTION[field] as string) === 'on'
          }))
        )
    )

  const startTimeSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.MODAL_START_TIME)
    .setRequired(true)
    .addOptions(
      Object.entries(START_TIME_LABELS).map(([value, label]) => ({
        value,
        label,
        default: value === DEFAULT_SELECTION.startTime
      }))
    )

  const startTimeLabel = new LabelBuilder()
    .setLabel('希望開始時間')
    .setStringSelectMenuComponent(startTimeSelect)

  const textLabel = new LabelBuilder()
    .setLabel('募集文（未入力でも投稿できます）')
    .setTextInputComponent(
      new TextInputBuilder()
        .setCustomId(CUSTOM_IDS.MODAL_TEXT_INPUT)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300)
        .setPlaceholder('おる？')
    )

  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.MODAL)
    .setTitle('スマブラ募集')
    .addLabelComponents(modeLabel, optionsLabel, startTimeLabel, textLabel)
}

/**
 * 募集メッセージに付ける「参加」「取り消し」ボタンの行を組み立てる。
 * メッセージは全員に同じ表示になり、見る人ごとにボタンを切り替えられないため、2つのボタンを並べる。
 *
 * @returns ボタンを2つ含むコンポーネント行
 */
export function buildJoinRow (): ActionRowBuilder<ButtonBuilder> {
  const joinButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.JOIN_BUTTON)
    .setLabel('参加')
    .setStyle(ButtonStyle.Success)

  const leaveButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.LEAVE_BUTTON)
    .setLabel('取り消し')
    .setStyle(ButtonStyle.Secondary)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton, leaveButton)
}

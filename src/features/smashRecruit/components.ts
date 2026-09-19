import {
  ModalBuilder,
  ActionRowBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js'
import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'
import { getDraft, setDraft, deleteDraft } from '../../utils/draftStore.js'
import { defineComponent } from '../../types.js'
import type { Component } from '../../types.js'
import { CUSTOM_IDS, FEATURE_KEY, MODE_LABELS, TOGGLE_LABELS } from './constants.js'
import { isComplete } from './types.js'
import type { RecruitDraft } from './types.js'
import { buildStatusLine, buildComponents } from './view.js'

/**
 * セレクトメニューの選択を入力状態に反映し、メッセージを更新するハンドラを作る。
 *
 * @param field - 更新する項目(mode / gimmick / item)
 * @param customId - このセレクトメニューの customId
 * @returns セレクトメニュー用のハンドラ
 */
function createSelectHandler<K extends keyof RecruitDraft> (
  field: K,
  customId: string
): Component {
  return defineComponent<StringSelectMenuInteraction>({
    customId,

    /**
     * 選択された値を保存し、選択状況を反映してメッセージを更新する。
     *
     * @param interaction - セレクトメニューのインタラクション
     */
    async execute (interaction: StringSelectMenuInteraction): Promise<void> {
      const state = getDraft<RecruitDraft>(FEATURE_KEY, interaction.user.id) ?? {}
      state[field] = interaction.values[0] as RecruitDraft[K]
      setDraft(FEATURE_KEY, interaction.user.id, state)

      await interaction.update({
        content: buildStatusLine(state),
        components: buildComponents(state)
      })
    }
  })
}

const selectModeHandler = createSelectHandler('mode', CUSTOM_IDS.SELECT_MODE)
const selectGimmickHandler = createSelectHandler('gimmick', CUSTOM_IDS.SELECT_GIMMICK)
const selectItemHandler = createSelectHandler('item', CUSTOM_IDS.SELECT_ITEM)

const cancelButtonHandler = defineComponent<ButtonInteraction>({
  customId: CUSTOM_IDS.CANCEL_BUTTON,

  /**
   * 入力状態を破棄し、キャンセルしたことを表示する。
   *
   * @param interaction - ボタンのインタラクション
   */
  async execute (interaction: ButtonInteraction): Promise<void> {
    deleteDraft(FEATURE_KEY, interaction.user.id)
    await interaction.update({
      content: '募集をキャンセルしました。',
      components: []
    })
  }
})

const submitButtonHandler = defineComponent<ButtonInteraction>({
  customId: CUSTOM_IDS.SUBMIT_BUTTON,

  /**
   * 3項目がそろっていれば、募集文を入力するモーダルを表示する。
   *
   * @param interaction - ボタンのインタラクション
   */
  async execute (interaction: ButtonInteraction): Promise<void> {
    const state = getDraft<RecruitDraft>(FEATURE_KEY, interaction.user.id)

    if (!isComplete(state)) {
      await interaction.reply({
        content: '先に3項目すべてを選択してください。',
        flags: MessageFlags.Ephemeral
      })
      return
    }

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.MODAL)
      .setTitle('募集文を入力（任意）')

    const textInput = new TextInputBuilder()
      .setCustomId(CUSTOM_IDS.MODAL_TEXT_INPUT)
      .setLabel('募集文（未入力でも投稿できます）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(300)
      .setPlaceholder('例：初心者歓迎！20時から2時間くらい遊びます')

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(textInput))

    await interaction.showModal(modal)
  }
})

const modalHandler = defineComponent<ModalSubmitInteraction>({
  customId: CUSTOM_IDS.MODAL,

  /**
   * 選択内容と募集文から募集メッセージを組み立て、対象チャンネルに投稿する。
   *
   * @param interaction - モーダル送信のインタラクション
   */
  async execute (interaction: ModalSubmitInteraction): Promise<void> {
    const state = getDraft<RecruitDraft>(FEATURE_KEY, interaction.user.id)

    if (!isComplete(state)) {
      await interaction.reply({
        content: '選択内容が見つかりませんでした。もう一度 /smash-recruit からやり直してください。',
        flags: MessageFlags.Ephemeral
      })
      return
    }

    const freeText = interaction.fields.getTextInputValue(CUSTOM_IDS.MODAL_TEXT_INPUT).trim()

    const announcement = [
      '@everyone',
      `${interaction.user.toString()} がスマブラの対戦相手を募集しています！`,
      '',
      `・対戦形式：${MODE_LABELS[state.mode]}`,
      `・ステージギミック：${TOGGLE_LABELS[state.gimmick]}`,
      `・アイテム：${TOGGLE_LABELS[state.item]}`,
      freeText !== '' ? `\n${freeText}` : ''
    ].join('\n')

    const recruitChannelId = process.env.RECRUIT_CHANNEL_ID
    const targetChannel = recruitChannelId !== undefined && recruitChannelId !== ''
      ? await interaction.client.channels.fetch(recruitChannelId)
      : interaction.channel

    // 投稿先が見つからない・送信できない種類のチャンネルの場合は、
    // 例外にして index.ts の共通エラー処理(ユーザーへのエラー通知)に任せる
    if (targetChannel === null || !targetChannel.isSendable()) {
      throw new Error('募集メッセージの投稿先チャンネルが見つからないか、送信できません')
    }

    await targetChannel.send({
      content: announcement,
      allowedMentions: { parse: ['everyone'] }
    })

    deleteDraft(FEATURE_KEY, interaction.user.id)

    await interaction.reply({
      content: '募集を投稿しました！',
      flags: MessageFlags.Ephemeral
    })
  }
})

export default [
  selectModeHandler,
  selectGimmickHandler,
  selectItemHandler,
  cancelButtonHandler,
  submitButtonHandler,
  modalHandler
]

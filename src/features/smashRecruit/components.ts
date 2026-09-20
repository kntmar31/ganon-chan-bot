import { MessageFlags } from 'discord.js'
import type { ModalSubmitInteraction } from 'discord.js'
import { defineComponent } from '../../types.js'
import { CUSTOM_IDS, DEFAULT_RECRUIT_TEXT, MODE_LABELS, TOGGLE_LABELS } from './constants.js'
import { isModeKey, isToggleKey } from './types.js'
import type { RecruitInput } from './types.js'

/**
 * モーダルの送信内容から、募集内容(3項目)を取り出す。
 * 送信値はクライアントから届くため、想定外の値が含まれていれば undefined を返す。
 *
 * @param interaction - モーダル送信のインタラクション
 * @returns 3項目がそろっていれば募集内容、そうでなければ undefined
 */
function readRecruitInput (interaction: ModalSubmitInteraction): RecruitInput | undefined {
  const mode = interaction.fields.getRadioGroup(CUSTOM_IDS.MODAL_MODE)
  const gimmick = interaction.fields.getRadioGroup(CUSTOM_IDS.MODAL_GIMMICK)
  const item = interaction.fields.getRadioGroup(CUSTOM_IDS.MODAL_ITEM)

  if (!isModeKey(mode) || !isToggleKey(gimmick) || !isToggleKey(item)) return undefined
  return { mode, gimmick, item }
}

const modalHandler = defineComponent<ModalSubmitInteraction>({
  customId: CUSTOM_IDS.MODAL,

  /**
   * 選択内容と募集文から募集メッセージを組み立て、対象チャンネルに投稿する。
   *
   * @param interaction - モーダル送信のインタラクション
   */
  async execute (interaction: ModalSubmitInteraction): Promise<void> {
    const input = readRecruitInput(interaction)

    if (input === undefined) {
      await interaction.reply({
        content: '選択内容を読み取れませんでした。もう一度 /smash-recruit からやり直してください。',
        flags: MessageFlags.Ephemeral
      })
      return
    }

    const freeText = interaction.fields.getTextInputValue(CUSTOM_IDS.MODAL_TEXT_INPUT).trim()

    // 1行目は「@everyone 募集文 (by 投稿者)」。募集文が未入力なら、決まった文言にする
    const announcement = [
      `@everyone ${freeText !== '' ? freeText : DEFAULT_RECRUIT_TEXT} (by ${interaction.user.toString()})`,
      '',
      `・対戦形式：${MODE_LABELS[input.mode]}`,
      `・ステージギミック：${TOGGLE_LABELS[input.gimmick]}`,
      `・アイテム：${TOGGLE_LABELS[input.item]}`
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

    await interaction.reply({
      content: '募集を投稿しました！',
      flags: MessageFlags.Ephemeral
    })
  }
})

export default [modalHandler]

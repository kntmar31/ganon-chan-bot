import { AttachmentBuilder, MessageFlags } from 'discord.js'
import type { ButtonInteraction, ModalSubmitInteraction, User } from 'discord.js'
import { defineComponent } from '../../types.js'
import { runExclusive } from '../../utils/keyedLock.js'
import {
  CUSTOM_IDS,
  DEFAULT_RECRUIT_TEXT,
  MAX_PARTICIPANTS,
  MODE_LABELS,
  TOGGLE_LABELS
} from './constants.js'
import { buildParticipantsFileName, parseParticipantIds, toggleParticipant } from './participants.js'
import { buildParticipantsImage, fetchImage } from './participantsImage.js'
import { isModeKey, isToggleKey } from './types.js'
import type { RecruitInput } from './types.js'
import { buildJoinRow } from './view.js'

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

/**
 * 参加者のアイコン画像を、添付ファイルとして組み立てる。
 * 参加者の一覧は、添付ファイル名に持たせる(Bot が状態を持たなくて済む)。
 *
 * @param ids - 参加者のユーザー ID(参加した順)
 * @param avatars - 参加者のアイコン画像(ids と同じ順。取得できなかった人は null)
 * @returns 添付ファイル
 */
async function buildParticipantsAttachment (
  ids: readonly string[],
  avatars: ReadonlyArray<Buffer | null>
): Promise<AttachmentBuilder> {
  const image = await buildParticipantsImage(avatars, MAX_PARTICIPANTS)
  return new AttachmentBuilder(image, { name: buildParticipantsFileName(ids) })
}

/**
 * ユーザーのアイコン画像をダウンロードする。
 *
 * @param user - アイコンを取得するユーザー
 * @returns アイコン画像。取得できなければ null
 */
async function fetchAvatar (user: User): Promise<Buffer | null> {
  return await fetchImage(user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }))
}

const joinButtonHandler = defineComponent<ButtonInteraction>({
  customId: CUSTOM_IDS.JOIN_BUTTON,

  /**
   * ボタンを押した人を、参加者に追加(参加済みなら取り消し)し、アイコン画像を作り直して投稿を書き換える。
   *
   * @param interaction - ボタンのインタラクション
   */
  async execute (interaction: ButtonInteraction): Promise<void> {
    // 画像の作成に時間がかかっても、3秒の応答期限に間に合うよう、先に受け付けたことを返す
    await interaction.deferUpdate()

    // 同じ投稿への同時操作で、参加者の一覧が上書きし合わないよう、投稿ごとに順番に処理する
    await runExclusive(interaction.message.id, async () => {
      // ボタンを押した時点のスナップショットではなく、直前の処理を反映した最新の投稿を読む
      const message = await interaction.fetchReply()
      const current = parseParticipantIds(message.attachments.first()?.name)
      const { ids, result } = toggleParticipant(current, interaction.user.id, MAX_PARTICIPANTS)

      if (result === 'full') {
        await interaction.followUp({
          content: `満員です(最大${MAX_PARTICIPANTS}人)。`,
          flags: MessageFlags.Ephemeral
        })
        return
      }

      // 取得に失敗した人(退会したユーザーなど)は、灰色の丸で表示する
      const avatars = await Promise.all(ids.map(async (id) => {
        const user = id === interaction.user.id
          ? interaction.user
          : await interaction.client.users.fetch(id).catch(() => null)
        return user === null ? null : await fetchAvatar(user)
      }))

      await interaction.editReply({
        files: [await buildParticipantsAttachment(ids, avatars)],
        // 古い画像を残さず、新しい画像に置き換える
        attachments: []
      })
    })
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

    // 投稿時点では参加者がいないので、空き枠だけの画像と、参加ボタンを付ける
    await targetChannel.send({
      content: announcement,
      files: [await buildParticipantsAttachment([], [])],
      components: [buildJoinRow()],
      allowedMentions: { parse: ['everyone'] }
    })

    await interaction.reply({
      content: '募集を投稿しました！',
      flags: MessageFlags.Ephemeral
    })
  }
})

export default [modalHandler, joinButtonHandler]

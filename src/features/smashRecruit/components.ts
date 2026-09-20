import { AttachmentBuilder, MessageFlags } from 'discord.js'
import type { ButtonInteraction, ModalSubmitInteraction, User } from 'discord.js'
import { runExclusive } from '../../utils/keyedLock.js'
import { defineComponent } from '../../types.js'
import type { Component } from '../../types.js'
import {
  CUSTOM_IDS,
  DEFAULT_RECRUIT_TEXT,
  MODE_LABELS,
  OPTION_CHECKBOXES,
  PARTICIPANTS_HEADING,
  START_TIME_LABELS,
  TOGGLE_LABELS
} from './constants.js'
import {
  addParticipant,
  buildParticipantsFileName,
  parseParticipantIds,
  removeParticipant
} from './participants.js'
import { buildParticipantsImage, fetchImage } from './participantsImage.js'
import { isModeKey, isStartTimeKey } from './types.js'
import type { RecruitInput, ToggleKey } from './types.js'
import { buildJoinRow } from './view.js'

/**
 * モーダルの送信内容から、募集内容(4項目)を取り出す。
 * 送信値はクライアントから届くため、対戦形式と希望開始時間に想定外の値が含まれていれば undefined を返す。
 *
 * @param interaction - モーダル送信のインタラクション
 * @returns 4項目がそろっていれば募集内容、そうでなければ undefined
 */
function readRecruitInput (interaction: ModalSubmitInteraction): RecruitInput | undefined {
  const mode = interaction.fields.getRadioGroup(CUSTOM_IDS.MODAL_MODE)
  const [startTime] = interaction.fields.getStringSelectValues(CUSTOM_IDS.MODAL_START_TIME)

  if (!isModeKey(mode) || !isStartTimeKey(startTime)) return undefined

  // ステージギミックとアイテムは、チェックされていれば「あり」、されていなければ「なし」
  const checked = interaction.fields.getCheckboxGroup(CUSTOM_IDS.MODAL_OPTIONS)
  const toggleOf = (field: 'gimmick' | 'item'): ToggleKey =>
    checked.includes(OPTION_CHECKBOXES[field].value) ? 'on' : 'off'

  return { mode, gimmick: toggleOf('gimmick'), item: toggleOf('item'), startTime }
}

/**
 * 参加者のアイコン画像を、添付ファイルとして組み立てる。
 * 参加者の一覧は、添付ファイル名に持たせる(Bot が状態を持たなくて済む)。
 *
 * @param ids - 参加者のユーザー ID(参加した順。1人以上)
 * @param avatars - 参加者のアイコン画像(ids と同じ順。取得できなかった人は null)
 * @returns 添付ファイル
 */
async function buildParticipantsAttachment (
  ids: readonly string[],
  avatars: ReadonlyArray<Buffer | null>
): Promise<AttachmentBuilder> {
  const image = await buildParticipantsImage(avatars)
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

/**
 * 参加者全員のアイコン画像を取得する。
 * ボタンを押した本人のユーザー情報は、インタラクションから使う。取得に失敗した人(退会したユーザーなど)は null にする。
 *
 * @param interaction - ボタンのインタラクション
 * @param ids - 参加者のユーザー ID(参加した順)
 * @returns 参加者のアイコン画像(ids と同じ順)
 */
async function fetchAvatars (
  interaction: ButtonInteraction,
  ids: readonly string[]
): Promise<Array<Buffer | null>> {
  return await Promise.all(ids.map(async (id) => {
    const user = id === interaction.user.id
      ? interaction.user
      : await interaction.client.users.fetch(id).catch(() => null)
    return user === null ? null : await fetchAvatar(user)
  }))
}

/**
 * 「参加」「取り消し」ボタンのハンドラを作る。
 * 押した人を参加者に反映し、アイコン画像を作り直して投稿を書き換える。
 * すでに参加している人が「参加」を押した場合などは、本人にだけ案内し、投稿は書き換えない。
 *
 * @param customId - このボタンの customId
 * @param action - ボタンの動作(join: 参加 / leave: 取り消し)
 * @returns ボタン用のハンドラ
 */
function createParticipantHandler (customId: string, action: 'join' | 'leave'): Component {
  return defineComponent<ButtonInteraction>({
    customId,

    /**
     * ボタンを押した人を参加者に反映し、投稿の参加者画像を更新する。
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
        const { ids, changed } = action === 'join'
          ? addParticipant(current, interaction.user.id)
          : removeParticipant(current, interaction.user.id)

        if (!changed) {
          await interaction.followUp({
            content: action === 'join' ? 'すでに参加しています。' : '参加していません。',
            flags: MessageFlags.Ephemeral
          })
          return
        }

        // 参加者が誰もいなくなったら、参加者画像を投稿から外す
        if (ids.length === 0) {
          await interaction.editReply({ attachments: [] })
          return
        }

        const avatars = await fetchAvatars(interaction, ids)
        await interaction.editReply({
          files: [await buildParticipantsAttachment(ids, avatars)],
          // 古い画像を残さず、新しい画像に置き換える
          attachments: []
        })
      })
    }
  })
}

const joinButtonHandler = createParticipantHandler(CUSTOM_IDS.JOIN_BUTTON, 'join')
const leaveButtonHandler = createParticipantHandler(CUSTOM_IDS.LEAVE_BUTTON, 'leave')

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

    // アイコン画像の作成に時間がかかっても、3秒の応答期限に間に合うよう、先に受け付けたことを返す
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const freeText = interaction.fields.getTextInputValue(CUSTOM_IDS.MODAL_TEXT_INPUT).trim()

    // 1行目は「@everyone 募集文 (by 投稿者)」。募集文が未入力なら、決まった文言にする。
    // 最後の「・参加者」は、その下に付く参加者のアイコン画像の見出しになる
    const announcement = [
      `@everyone ${freeText !== '' ? freeText : DEFAULT_RECRUIT_TEXT} (by ${interaction.user.toString()})`,
      `・対戦形式：${MODE_LABELS[input.mode]}`,
      `・ステージギミック：${TOGGLE_LABELS[input.gimmick]}`,
      `・アイテム：${TOGGLE_LABELS[input.item]}`,
      `・希望開始時間：${START_TIME_LABELS[input.startTime]}`,
      PARTICIPANTS_HEADING
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

    // 投稿者は、最初から参加者になる
    const posterAvatar = await fetchAvatar(interaction.user)
    await targetChannel.send({
      content: announcement,
      files: [await buildParticipantsAttachment([interaction.user.id], [posterAvatar])],
      components: [buildJoinRow()],
      allowedMentions: { parse: ['everyone'] }
    })

    await interaction.editReply({ content: '募集を投稿しました！' })
  }
})

export default [modalHandler, joinButtonHandler, leaveButtonHandler]

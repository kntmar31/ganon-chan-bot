import { MessageFlags } from 'discord.js'
import type { Component } from '../../../src/types.js'
import components from '../../../src/features/smashRecruit/components.js'
import { CUSTOM_IDS, FEATURE_KEY } from '../../../src/features/smashRecruit/constants.js'
import type { RecruitDraft } from '../../../src/features/smashRecruit/types.js'
import { deleteDraft, getDraft, setDraft } from '../../../src/utils/draftStore.js'

const USER_ID = 'user-1'

/**
 * customId から、募集機能のハンドラを取り出す。
 *
 * @param customId - 取り出したいハンドラの customId
 * @returns 該当のハンドラ
 */
function handlerOf (customId: string): Component {
  const handler = components.find((component) => component.customId === customId)
  if (handler === undefined) throw new Error(`ハンドラが見つかりません: ${customId}`)
  return handler
}

/**
 * ハンドラに渡すインタラクションのモックを作る。
 * テストで使うメソッドとプロパティだけを持たせ、型は呼び出し側で合わせる。
 *
 * @param extra - モックに追加するプロパティ(values や channel など)
 * @returns インタラクションのモック
 */
function mockInteraction (extra: Record<string, unknown> = {}): any {
  return {
    user: { id: USER_ID, toString: () => `<@${USER_ID}>` },
    reply: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    showModal: jest.fn().mockResolvedValue(undefined),
    ...extra
  }
}

/**
 * モーダル送信のインタラクションのモックを作る。
 *
 * @param freeText - 募集文の入力値
 * @param extra - モックに追加するプロパティ(channel や client など)
 * @returns モーダル送信のモック
 */
function mockModalInteraction (freeText: string, extra: Record<string, unknown> = {}): any {
  return mockInteraction({
    fields: { getTextInputValue: jest.fn().mockReturnValue(freeText) },
    ...extra
  })
}

const completeDraft: RecruitDraft = { mode: 'individual', gimmick: 'on', item: 'off' }

describe('smashRecruit components', () => {
  const originalChannelId = process.env.RECRUIT_CHANNEL_ID

  beforeEach(() => {
    delete process.env.RECRUIT_CHANNEL_ID
  })

  afterEach(() => {
    deleteDraft(FEATURE_KEY, USER_ID)
    if (originalChannelId === undefined) {
      delete process.env.RECRUIT_CHANNEL_ID
    } else {
      process.env.RECRUIT_CHANNEL_ID = originalChannelId
    }
  })

  test('全ハンドラの customId が重複していない', () => {
    const ids = components.map((component) => component.customId)

    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('セレクトメニュー', () => {
    test('選択した値を入力状態に保存し、メッセージを更新する', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, {})
      const interaction = mockInteraction({ values: ['team'] })

      await handlerOf(CUSTOM_IDS.SELECT_MODE).execute(interaction)

      expect(getDraft<RecruitDraft>(FEATURE_KEY, USER_ID)).toEqual({ mode: 'team' })
      expect(interaction.update).toHaveBeenCalledTimes(1)
      expect(interaction.update.mock.calls[0][0].content).toContain('・対戦形式：チーム戦')
    })

    test('すでに選択済みの他の項目は保持される', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, { mode: 'both', gimmick: 'on' })

      await handlerOf(CUSTOM_IDS.SELECT_ITEM).execute(mockInteraction({ values: ['off'] }))

      expect(getDraft<RecruitDraft>(FEATURE_KEY, USER_ID)).toEqual({
        mode: 'both',
        gimmick: 'on',
        item: 'off'
      })
    })

    test('入力状態がなくても(Bot再起動後など)新しく作って保存できる', async () => {
      await handlerOf(CUSTOM_IDS.SELECT_GIMMICK).execute(mockInteraction({ values: ['off'] }))

      expect(getDraft<RecruitDraft>(FEATURE_KEY, USER_ID)).toEqual({ gimmick: 'off' })
    })
  })

  describe('キャンセルボタン', () => {
    test('入力状態を破棄し、コンポーネントを消してメッセージを更新する', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const interaction = mockInteraction()

      await handlerOf(CUSTOM_IDS.CANCEL_BUTTON).execute(interaction)

      expect(getDraft(FEATURE_KEY, USER_ID)).toBeUndefined()
      expect(interaction.update).toHaveBeenCalledWith({
        content: '募集をキャンセルしました。',
        components: []
      })
    })
  })

  describe('投稿ボタン', () => {
    test('3項目が未選択なら、本人にだけ案内を返してモーダルは出さない', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, { mode: 'team' })
      const interaction = mockInteraction()

      await handlerOf(CUSTOM_IDS.SUBMIT_BUTTON).execute(interaction)

      expect(interaction.reply).toHaveBeenCalledWith({
        content: '先に3項目すべてを選択してください。',
        flags: MessageFlags.Ephemeral
      })
      expect(interaction.showModal).not.toHaveBeenCalled()
    })

    test('入力状態が存在しなくてもモーダルは出さない', async () => {
      const interaction = mockInteraction()

      await handlerOf(CUSTOM_IDS.SUBMIT_BUTTON).execute(interaction)

      expect(interaction.showModal).not.toHaveBeenCalled()
    })

    test('3項目すべて選択済みなら、モーダルを表示する', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const interaction = mockInteraction()

      await handlerOf(CUSTOM_IDS.SUBMIT_BUTTON).execute(interaction)

      expect(interaction.showModal).toHaveBeenCalledTimes(1)
      expect(interaction.reply).not.toHaveBeenCalled()
    })
  })

  describe('モーダル送信', () => {
    test('入力状態が見つからなければ、やり直しを案内して投稿しない', async () => {
      const send = jest.fn()
      const interaction = mockModalInteraction('', { channel: { isSendable: () => true, send } })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      expect(interaction.reply).toHaveBeenCalledWith({
        content: '選択内容が見つかりませんでした。もう一度 /smash-recruit からやり直してください。',
        flags: MessageFlags.Ephemeral
      })
      expect(send).not.toHaveBeenCalled()
    })

    test('募集文なしで、コマンドを実行したチャンネルに募集メッセージを投稿する', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('', { channel: { isSendable: () => true, send } })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      expect(send).toHaveBeenCalledWith({
        content: [
          '@everyone',
          '<@user-1> がスマブラの対戦相手を募集しています！',
          '',
          '・対戦形式：個人戦',
          '・ステージギミック：あり',
          '・アイテム：なし',
          ''
        ].join('\n'),
        allowedMentions: { parse: ['everyone'] }
      })
      expect(interaction.reply).toHaveBeenCalledWith({
        content: '募集を投稿しました！',
        flags: MessageFlags.Ephemeral
      })
    })

    test('募集文があれば、前後の空白を除いて末尾に付ける', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('  初心者歓迎！  ', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content.endsWith('・アイテム：なし\n\n初心者歓迎！')).toBe(true)
    })

    test('投稿後は入力状態を破棄する', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const send = jest.fn().mockResolvedValue(undefined)

      await handlerOf(CUSTOM_IDS.MODAL).execute(
        mockModalInteraction('', { channel: { isSendable: () => true, send } })
      )

      expect(getDraft(FEATURE_KEY, USER_ID)).toBeUndefined()
    })

    test('RECRUIT_CHANNEL_ID が設定されていれば、そのチャンネルに投稿する', async () => {
      process.env.RECRUIT_CHANNEL_ID = 'channel-123'
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const commandChannelSend = jest.fn()
      const fixedChannelSend = jest.fn().mockResolvedValue(undefined)
      const fetch = jest.fn().mockResolvedValue({ isSendable: () => true, send: fixedChannelSend })
      const interaction = mockModalInteraction('', {
        channel: { isSendable: () => true, send: commandChannelSend },
        client: { channels: { fetch } }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      expect(fetch).toHaveBeenCalledWith('channel-123')
      expect(fixedChannelSend).toHaveBeenCalledTimes(1)
      expect(commandChannelSend).not.toHaveBeenCalled()
    })

    test('RECRUIT_CHANNEL_ID が空文字なら、コマンドを実行したチャンネルに投稿する', async () => {
      process.env.RECRUIT_CHANNEL_ID = ''
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const send = jest.fn().mockResolvedValue(undefined)
      const fetch = jest.fn()
      const interaction = mockModalInteraction('', {
        channel: { isSendable: () => true, send },
        client: { channels: { fetch } }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      expect(fetch).not.toHaveBeenCalled()
      expect(send).toHaveBeenCalledTimes(1)
    })

    test('投稿先が見つからなければ例外を投げ、入力状態は残す(やり直せるように)', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const interaction = mockModalInteraction('', { channel: null })

      await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow(
        '募集メッセージの投稿先チャンネルが見つからないか、送信できません'
      )
      expect(getDraft(FEATURE_KEY, USER_ID)).toEqual(completeDraft)
      expect(interaction.reply).not.toHaveBeenCalled()
    })

    test('投稿先が送信できない種類のチャンネルなら例外を投げる', async () => {
      setDraft<RecruitDraft>(FEATURE_KEY, USER_ID, completeDraft)
      const interaction = mockModalInteraction('', { channel: { isSendable: () => false } })

      await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow()
    })
  })
})

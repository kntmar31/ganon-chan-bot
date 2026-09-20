import { MessageFlags } from 'discord.js'
import type { Component } from '../../../src/types.js'
import components from '../../../src/features/smashRecruit/components.js'
import { CUSTOM_IDS } from '../../../src/features/smashRecruit/constants.js'

const USER_ID = 'user-1'

/** モーダルで選択された3項目(getRadioGroup が返す値) */
const completeSelection: Record<string, string | null> = {
  [CUSTOM_IDS.MODAL_MODE]: 'individual',
  [CUSTOM_IDS.MODAL_GIMMICK]: 'on',
  [CUSTOM_IDS.MODAL_ITEM]: 'off'
}

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
 * モーダル送信のインタラクションのモックを作る。
 * テストで使うメソッドとプロパティだけを持たせ、型は呼び出し側で合わせる。
 *
 * @param freeText - 募集文の入力値
 * @param extra - モックに追加するプロパティ(channel や client など)
 * @param selection - ラジオグループの選択値(customId をキーにする)
 * @returns モーダル送信のモック
 */
function mockModalInteraction (
  freeText: string,
  extra: Record<string, unknown> = {},
  selection: Record<string, string | null> = completeSelection
): any {
  return {
    user: { id: USER_ID, toString: () => `<@${USER_ID}>` },
    reply: jest.fn().mockResolvedValue(undefined),
    fields: {
      getTextInputValue: jest.fn().mockReturnValue(freeText),
      getRadioGroup: jest.fn((customId: string) => selection[customId] ?? null)
    },
    ...extra
  }
}

describe('smashRecruit components', () => {
  const originalChannelId = process.env.RECRUIT_CHANNEL_ID

  beforeEach(() => {
    delete process.env.RECRUIT_CHANNEL_ID
  })

  afterEach(() => {
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

  describe('モーダル送信', () => {
    test('募集文なしで、コマンドを実行したチャンネルに募集メッセージを投稿する', async () => {
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

    test('選択した内容が、そのまま投稿文に反映される', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('', { channel: { isSendable: () => true, send } }, {
        [CUSTOM_IDS.MODAL_MODE]: 'team',
        [CUSTOM_IDS.MODAL_GIMMICK]: 'off',
        [CUSTOM_IDS.MODAL_ITEM]: 'on'
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content).toContain('・対戦形式：チーム戦')
      expect(content).toContain('・ステージギミック：なし')
      expect(content).toContain('・アイテム：あり')
    })

    test('募集文があれば、前後の空白を除いて末尾に付ける', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('  初心者歓迎！  ', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content.endsWith('・アイテム：なし\n\n初心者歓迎！')).toBe(true)
    })

    test.each([
      ['対戦形式が未選択', { ...completeSelection, [CUSTOM_IDS.MODAL_MODE]: null }],
      ['ギミックが未選択', { ...completeSelection, [CUSTOM_IDS.MODAL_GIMMICK]: null }],
      ['アイテムが未選択', { ...completeSelection, [CUSTOM_IDS.MODAL_ITEM]: null }],
      ['対戦形式が想定外の値', { ...completeSelection, [CUSTOM_IDS.MODAL_MODE]: 'unknown' }],
      ['ギミックが想定外の値', { ...completeSelection, [CUSTOM_IDS.MODAL_GIMMICK]: 'maybe' }],
      ['アイテムに対戦形式の値', { ...completeSelection, [CUSTOM_IDS.MODAL_ITEM]: 'team' }]
    ])('%sなら、やり直しを案内して投稿しない', async (_name, selection) => {
      const send = jest.fn()
      const interaction = mockModalInteraction('', { channel: { isSendable: () => true, send } }, selection)

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      expect(interaction.reply).toHaveBeenCalledWith({
        content: '選択内容を読み取れませんでした。もう一度 /smash-recruit からやり直してください。',
        flags: MessageFlags.Ephemeral
      })
      expect(send).not.toHaveBeenCalled()
    })

    test('RECRUIT_CHANNEL_ID が設定されていれば、そのチャンネルに投稿する', async () => {
      process.env.RECRUIT_CHANNEL_ID = 'channel-123'
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

    test('投稿先が見つからなければ例外を投げ、成功の返信はしない', async () => {
      const interaction = mockModalInteraction('', { channel: null })

      await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow(
        '募集メッセージの投稿先チャンネルが見つからないか、送信できません'
      )
      expect(interaction.reply).not.toHaveBeenCalled()
    })

    test('投稿先が送信できない種類のチャンネルなら例外を投げる', async () => {
      const interaction = mockModalInteraction('', { channel: { isSendable: () => false } })

      await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow()
    })
  })
})

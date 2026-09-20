import sharp from 'sharp'
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

      expect(send).toHaveBeenCalledWith(expect.objectContaining({
        content: [
          '@everyone おる？ (by <@user-1>)',
          '',
          '・対戦形式：個人戦',
          '・ステージギミック：あり',
          '・アイテム：なし'
        ].join('\n'),
        allowedMentions: { parse: ['everyone'] }
      }))
      expect(interaction.reply).toHaveBeenCalledWith({
        content: '募集を投稿しました！',
        flags: MessageFlags.Ephemeral
      })
    })

    test('投稿には、空き枠だけの参加者画像と、参加ボタンが付く', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('', { channel: { isSendable: () => true, send } })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const sent = send.mock.calls[0][0] as {
        files: Array<{ name: string }>
        components: Array<{ toJSON: () => { components: Array<{ custom_id: string }> } }>
      }
      expect(sent.files).toHaveLength(1)
      expect(sent.files[0].name).toBe('participants.png')
      expect(sent.components).toHaveLength(1)
      expect(sent.components[0].toJSON().components[0].custom_id).toBe(CUSTOM_IDS.JOIN_BUTTON)
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

    test('募集文があれば、前後の空白を除いて1行目の「おる？」の代わりに入れる', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('  初心者歓迎！  ', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content.split('\n')[0]).toBe('@everyone 初心者歓迎！ (by <@user-1>)')
      expect(content).not.toContain('おる？')
    })

    test('募集文があっても、選択内容の3行は末尾に残り、募集文は重複して載らない', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('初心者歓迎！', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content).toBe([
        '@everyone 初心者歓迎！ (by <@user-1>)',
        '',
        '・対戦形式：個人戦',
        '・ステージギミック：あり',
        '・アイテム：なし'
      ].join('\n'))
    })

    test('空白だけの募集文は、未入力と同じ扱いで「おる？」になる', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('   \n  ', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content.split('\n')[0]).toBe('@everyone おる？ (by <@user-1>)')
    })

    test('改行を含む募集文は、そのまま1行目の位置に入り、末尾に (by 投稿者) が付く', async () => {
      const send = jest.fn().mockResolvedValue(undefined)
      const interaction = mockModalInteraction('初心者歓迎！\n20時から', {
        channel: { isSendable: () => true, send }
      })

      await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

      const { content } = send.mock.calls[0][0] as { content: string }
      expect(content.startsWith('@everyone 初心者歓迎！\n20時から (by <@user-1>)\n\n・対戦形式：')).toBe(true)
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

describe('smashRecruit 参加ボタン', () => {
  let avatarPng: Buffer

  beforeAll(async () => {
    avatarPng = await sharp({
      create: { width: 128, height: 128, channels: 3, background: { r: 10, g: 20, b: 30 } }
    }).png().toBuffer()
  })

  beforeEach(() => {
    // アイコン画像のダウンロードは、常に成功するものとして扱う
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array(avatarPng)))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  /**
   * 参加ボタンのインタラクションのモックを作る。
   *
   * @param userId - ボタンを押した人のユーザー ID
   * @param currentFileName - 投稿に付いている参加者画像のファイル名(付いていなければ undefined)
   * @param extra - モックに追加・上書きするプロパティ
   * @returns ボタンのインタラクションのモック
   */
  function mockJoinInteraction (
    userId: string,
    currentFileName: string | undefined,
    extra: Record<string, unknown> = {}
  ): any {
    const avatarUrl = (id: string): string => `https://cdn.example/${id}.png`
    return {
      user: { id: userId, displayAvatarURL: () => avatarUrl(userId) },
      message: { id: 'message-1' },
      deferUpdate: jest.fn().mockResolvedValue(undefined),
      fetchReply: jest.fn().mockResolvedValue({
        attachments: { first: () => currentFileName === undefined ? undefined : { name: currentFileName } }
      }),
      editReply: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn().mockResolvedValue(undefined),
      client: {
        users: {
          fetch: jest.fn(async (id: string) => ({ id, displayAvatarURL: () => avatarUrl(id) }))
        }
      },
      ...extra
    }
  }

  /**
   * editReply に渡された、新しい参加者画像のファイル名を取り出す。
   *
   * @param interaction - ボタンのインタラクションのモック
   * @returns 添付ファイル名
   */
  function editedFileName (interaction: any): string {
    return (interaction.editReply.mock.calls[0][0] as { files: Array<{ name: string }> }).files[0].name
  }

  test('参加していない人が押すと、その人が参加者に加わり、画像が差し替えられる', async () => {
    const interaction = mockJoinInteraction('111', 'participants.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(interaction.editReply).toHaveBeenCalledTimes(1)
    expect(editedFileName(interaction)).toBe('participants-111.png')
    // 古い画像を残さず、置き換える
    expect(interaction.editReply.mock.calls[0][0].attachments).toEqual([])
  })

  test('すでにいる参加者は保持され、押した人が末尾に加わる', async () => {
    const interaction = mockJoinInteraction('333', 'participants-111-222.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-111-222-333.png')
  })

  test('参加済みの人が押すと、取り消される', async () => {
    const interaction = mockJoinInteraction('222', 'participants-111-222-333.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-111-333.png')
  })

  test('参加者画像が付いていない投稿でも(想定外)、空の一覧として扱って参加できる', async () => {
    const interaction = mockJoinInteraction('111', undefined)

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-111.png')
  })

  test('満員なら、本人にだけ案内し、投稿は書き換えない', async () => {
    const full = 'participants-1-2-3-4-5-6-7-8.png'
    const interaction = mockJoinInteraction('9', full)

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: '満員です(最大8人)。',
      flags: MessageFlags.Ephemeral
    })
    expect(interaction.editReply).not.toHaveBeenCalled()
  })

  test('満員でも、参加済みの人は取り消せる', async () => {
    const interaction = mockJoinInteraction('8', 'participants-1-2-3-4-5-6-7-8.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-1-2-3-4-5-6-7.png')
  })

  test('画像の作成より先に、受け付けたことを Discord に返す(3秒の応答期限のため)', async () => {
    const interaction = mockJoinInteraction('111', 'participants.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    const deferOrder = interaction.deferUpdate.mock.invocationCallOrder[0]
    expect(deferOrder).toBeLessThan(interaction.fetchReply.mock.invocationCallOrder[0])
    expect(deferOrder).toBeLessThan(interaction.editReply.mock.invocationCallOrder[0])
  })

  test('他の参加者のユーザー情報は取得し、押した本人は取得し直さない', async () => {
    const interaction = mockJoinInteraction('333', 'participants-111-222.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(interaction.client.users.fetch).toHaveBeenCalledTimes(2)
    expect(interaction.client.users.fetch).toHaveBeenCalledWith('111')
    expect(interaction.client.users.fetch).toHaveBeenCalledWith('222')
  })

  test('アイコン画像のダウンロードに失敗しても、投稿は更新される', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
    const interaction = mockJoinInteraction('222', 'participants-111.png')

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-111-222.png')
  })

  test('他の参加者のユーザー情報を取得できなくても、その人は参加者のまま保持される', async () => {
    const interaction = mockJoinInteraction('222', 'participants-111.png')
    interaction.client.users.fetch.mockRejectedValue(new Error('Unknown User'))

    await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

    expect(editedFileName(interaction)).toBe('participants-111-222.png')
  })

  test('同じ投稿への同時の操作でも、参加者の一覧が上書きし合わず、両方が反映される', async () => {
    // 投稿の状態を共有し、読み取りと書き込みに時間がかかる状況を再現する
    const post = { fileName: 'participants.png' }
    const delay = async (): Promise<void> => await new Promise((resolve) => setTimeout(resolve, 10))
    const overrides = {
      fetchReply: jest.fn(async () => {
        await delay()
        return { attachments: { first: () => ({ name: post.fileName }) } }
      }),
      editReply: jest.fn(async (options: { files: Array<{ name: string }> }) => {
        await delay()
        post.fileName = options.files[0].name
      })
    }
    const first = mockJoinInteraction('111', undefined, overrides)
    const second = mockJoinInteraction('222', undefined, overrides)

    await Promise.all([
      handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(first),
      handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(second)
    ])

    expect(post.fileName).toBe('participants-111-222.png')
  })
})

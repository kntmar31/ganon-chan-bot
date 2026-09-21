import sharp from 'sharp'
import { MessageFlags } from 'discord.js'
import type { Component } from '../../../src/types.js'
import components from '../../../src/features/smashRecruit/components.js'
import { AVATAR_GAP, AVATAR_SIZE, AVATARS_PER_ROW, CUSTOM_IDS } from '../../../src/features/smashRecruit/constants.js'

/** 募集した人(モーダルを送信した人)のユーザー ID */
const POSTER_ID = '100'

/** 投稿済みの募集メッセージの本文(「・募集した人」の行を含む) */
const RECRUIT_CONTENT = [
  '@everyone おる？',
  '・対戦形式：個人戦',
  '・ステージギミック：なし',
  '・アイテム：なし',
  '・希望開始時間：23:00',
  `・募集した人：<@${POSTER_ID}>`,
  '・参加者'
].join('\n')

/** 1列ぶん(8人ぶん)の画像の幅 */
const ROW_WIDTH = AVATARS_PER_ROW * AVATAR_SIZE + (AVATARS_PER_ROW - 1) * AVATAR_GAP

/** アイコン画像の URL を、ユーザー ID から作る */
const avatarUrl = (id: string): string => `https://cdn.example/${id}.png`

/** モーダルで選択された内容(各 getter が返す値) */
interface ModalSelection {
  mode: string | null
  checked: string[]
  startTime: string[]
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
 * ユーザーのモックを作る。
 *
 * @param id - ユーザー ID
 * @returns ユーザーのモック(displayAvatarURL は、呼び出しを記録する)
 */
function mockUser (id: string): any {
  return {
    id,
    toString: () => `<@${id}>`,
    displayAvatarURL: jest.fn(() => avatarUrl(id))
  }
}

/**
 * モーダル送信のインタラクションのモックを作る。
 * テストで使うメソッドとプロパティだけを持たせ、型は呼び出し側で合わせる。
 *
 * @param freeText - 募集文の入力値
 * @param extra - モックに追加するプロパティ(channel や client など)
 * @param selection - モーダルで選択された内容(指定しなかった項目は、デフォルトの選択)
 * @returns モーダル送信のモック
 */
function mockModalInteraction (
  freeText: string,
  extra: Record<string, unknown> = {},
  selection: Partial<ModalSelection> = {}
): any {
  const selected: ModalSelection = { mode: 'individual', checked: [], startTime: ['23:00'], ...selection }
  return {
    user: mockUser(POSTER_ID),
    reply: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    fields: {
      getTextInputValue: jest.fn().mockReturnValue(freeText),
      getRadioGroup: jest.fn((customId: string) => customId === CUSTOM_IDS.MODAL_MODE ? selected.mode : null),
      getCheckboxGroup: jest.fn(() => selected.checked),
      getStringSelectValues: jest.fn(() => selected.startTime)
    },
    ...extra
  }
}

/**
 * 投稿先チャンネルのモックを作る。
 *
 * @returns チャンネルのモックと、その send のモック
 */
function mockChannel (): { channel: any, send: jest.Mock } {
  const send = jest.fn().mockResolvedValue(undefined)
  return { channel: { isSendable: () => true, send }, send }
}

/**
 * send に渡された投稿の内容を取り出す。
 *
 * @param send - チャンネルの send のモック
 * @returns 投稿の内容
 */
function postedMessage (send: jest.Mock): {
  content: string
  files: Array<{ name: string, attachment: Buffer }>
  components: Array<{ toJSON: () => { components: Array<{ custom_id: string, label: string }> } }>
  allowedMentions: unknown
} {
  return send.mock.calls[0][0]
}

describe('smashRecruit components', () => {
  let avatarPng: Buffer
  const originalChannelId = process.env.RECRUIT_CHANNEL_ID

  beforeAll(async () => {
    avatarPng = await sharp({
      create: { width: 256, height: 256, channels: 3, background: { r: 10, g: 20, b: 30 } }
    }).png().toBuffer()
  })

  beforeEach(() => {
    delete process.env.RECRUIT_CHANNEL_ID
    // アイコン画像のダウンロードは、常に成功するものとして扱う
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(new Uint8Array(avatarPng)))
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalChannelId === undefined) {
      delete process.env.RECRUIT_CHANNEL_ID
    } else {
      process.env.RECRUIT_CHANNEL_ID = originalChannelId
    }
  })

  test('モーダル・参加・取り消しの3つのハンドラがあり、customId が重複していない', () => {
    const ids = components.map((component) => component.customId)

    expect(ids.sort()).toEqual([CUSTOM_IDS.JOIN_BUTTON, CUSTOM_IDS.LEAVE_BUTTON, CUSTOM_IDS.MODAL].sort())
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('モーダル送信', () => {
    describe('投稿の文面', () => {
      test('募集文なしで、選択内容がデフォルトのとき', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        expect(postedMessage(send).content).toBe([
          '@everyone おる？',
          '・対戦形式：個人戦',
          '・ステージギミック：なし',
          '・アイテム：なし',
          '・希望開始時間：23:00',
          '・募集した人：<@100>',
          '・参加者'
        ].join('\n'))
      })

      test('募集文があれば、前後の空白を除いて、1行目に入る(「おる？」は入らない)', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('  初心者歓迎！  ', { channel }))

        const { content } = postedMessage(send)
        expect(content.split('\n')[0]).toBe('@everyone 初心者歓迎！')
        expect(content).not.toContain('おる？')
      })

      test('空白や改行だけの募集文は、未入力と同じ扱いで「おる？」になる', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('   \n  ', { channel }))

        expect(postedMessage(send).content.split('\n')[0]).toBe('@everyone おる？')
      })

      test('改行を含む募集文は、そのまま1行目の位置に入る', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('初心者歓迎！\n20時から', { channel }))

        expect(postedMessage(send).content.startsWith('@everyone 初心者歓迎！\n20時から\n・対戦形式：')).toBe(true)
      })

      test('「(by 投稿者)」は付かず、募集した人は「・募集した人」の行にだけ載る', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('初心者歓迎！', { channel }))

        const { content } = postedMessage(send)
        expect(content).not.toContain('(by')
        expect(content.match(/<@100>/g)).toHaveLength(1)
        expect(content.split('\n')[0]).not.toContain('<@100>')
      })

      test('「・募集した人」は、「・希望開始時間」と「・参加者」のあいだにある', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        const lines = postedMessage(send).content.split('\n')
        expect(lines.slice(-3)).toEqual(['・希望開始時間：23:00', '・募集した人：<@100>', '・参加者'])
      })

      test('1行目と「・対戦形式」のあいだなど、空白行はない', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        expect(postedMessage(send).content.split('\n')).not.toContain('')
      })

      test('最後の行は、参加者のアイコン画像の見出し「・参加者」', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        expect(postedMessage(send).content.split('\n').at(-1)).toBe('・参加者')
      })

      test('選択した対戦形式・希望開始時間が、そのまま投稿文に反映される', async () => {
        const { channel, send } = mockChannel()
        const selection = { mode: 'both', startTime: ['0:30'] }

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }, selection))

        const { content } = postedMessage(send)
        expect(content).toContain('・対戦形式：個人戦 / チーム戦 どちらも')
        expect(content).toContain('・希望開始時間：0:30')
      })

      test.each([
        ['23:00', '23:00'],
        ['23:30', '23:30'],
        ['0:00', '0:00'],
        ['0:30', '0:30'],
        ['1:00', '1:00'],
        ['other', 'その他']
      ])('希望開始時間 %s は、「%s」と表示される', async (value, label) => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }, { startTime: [value] }))

        expect(postedMessage(send).content).toContain(`・希望開始時間：${label}`)
      })

      test.each([
        ['何もチェックしない', [], 'なし', 'なし'],
        ['ステージギミックだけ', ['gimmick'], 'あり', 'なし'],
        ['アイテムだけ', ['item'], 'なし', 'あり'],
        ['両方', ['gimmick', 'item'], 'あり', 'あり'],
        ['チェックの順番が逆', ['item', 'gimmick'], 'あり', 'あり'],
        ['想定外の値だけ', ['unknown'], 'なし', 'なし']
      ])('チェックボックスが「%s」なら、ギミック「%s」・アイテム「%s」になる', async (_name, checked, gimmick, item) => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }, { checked }))

        const { content } = postedMessage(send)
        expect(content).toContain(`・ステージギミック：${gimmick}`)
        expect(content).toContain(`・アイテム：${item}`)
      })
    })

    describe('投稿に付くもの', () => {
      test('通知は @everyone だけ(ユーザーのメンションでは通知されない)', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        expect(postedMessage(send).allowedMentions).toEqual({ parse: ['everyone'] })
      })

      test('「参加」「取り消し」のボタンが付く', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        const { components: rows } = postedMessage(send)
        expect(rows).toHaveLength(1)
        expect(rows[0].toJSON().components.map((button) => [button.label, button.custom_id])).toEqual([
          ['参加', CUSTOM_IDS.JOIN_BUTTON],
          ['取り消し', CUSTOM_IDS.LEAVE_BUTTON]
        ])
      })

      test('投稿者が最初から参加者になり、そのアイコンだけが載った画像が付く', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        const { files } = postedMessage(send)
        expect(files).toHaveLength(1)
        expect(files[0].name).toBe('participants-100.png')
        const { width, height } = await sharp(files[0].attachment).metadata()
        expect(width).toBe(ROW_WIDTH)
        expect(height).toBe(AVATAR_SIZE)
      })

      test('空き枠は描かれない(投稿者のアイコンの右側は透明)', async () => {
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        const { data, info } = await sharp(postedMessage(send).files[0].attachment)
          .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const second = (AVATAR_SIZE / 2) * info.width + AVATAR_SIZE + AVATAR_GAP + AVATAR_SIZE / 2
        expect(data[second * info.channels + 3]).toBe(0)
      })

      test('投稿者のアイコンは、256px の PNG(静止画)で取得する', async () => {
        const { channel } = mockChannel()
        const interaction = mockModalInteraction('', { channel })

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(interaction.user.displayAvatarURL).toHaveBeenCalledWith({
          extension: 'png',
          size: 256,
          forceStatic: true
        })
        expect(globalThis.fetch).toHaveBeenCalledWith(avatarUrl(POSTER_ID))
      })

      test('投稿者のアイコンをダウンロードできなくても、投稿は成功し、投稿者は参加者になる', async () => {
        jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
        const { channel, send } = mockChannel()

        await handlerOf(CUSTOM_IDS.MODAL).execute(mockModalInteraction('', { channel }))

        expect(postedMessage(send).files[0].name).toBe('participants-100.png')
      })
    })

    describe('応答', () => {
      test('画像の作成が3秒の期限に間に合うよう、先に本人にだけの応答を受け付けてから投稿する', async () => {
        const { channel, send } = mockChannel()
        const interaction = mockModalInteraction('', { channel })

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral })
        expect(interaction.deferReply.mock.invocationCallOrder[0]).toBeLessThan(send.mock.invocationCallOrder[0])
      })

      test('投稿後に、「募集を投稿しました！」と本人に伝える', async () => {
        const { channel, send } = mockChannel()
        const interaction = mockModalInteraction('', { channel })

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(interaction.editReply).toHaveBeenCalledWith({ content: '募集を投稿しました！' })
        expect(send.mock.invocationCallOrder[0]).toBeLessThan(interaction.editReply.mock.invocationCallOrder[0])
        expect(interaction.reply).not.toHaveBeenCalled()
      })
    })

    describe('送信値が想定外のとき', () => {
      test.each([
        ['対戦形式が未選択', { mode: null }],
        ['対戦形式が想定外の値', { mode: 'unknown' }],
        ['対戦形式にあり/なしの値', { mode: 'on' }],
        ['希望開始時間が未選択', { startTime: [] }],
        ['希望開始時間が想定外の値', { startTime: ['24:00'] }],
        ['希望開始時間に対戦形式の値', { startTime: ['team'] }]
      ])('%sなら、やり直しを案内して、投稿しない', async (_name, selection) => {
        const { channel, send } = mockChannel()
        const interaction = mockModalInteraction('', { channel }, selection)

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(interaction.reply).toHaveBeenCalledWith({
          content: '選択内容を読み取れませんでした。もう一度 /smash-recruit からやり直してください。',
          flags: MessageFlags.Ephemeral
        })
        expect(interaction.deferReply).not.toHaveBeenCalled()
        expect(send).not.toHaveBeenCalled()
      })
    })

    describe('投稿先のチャンネル', () => {
      test('RECRUIT_CHANNEL_ID が設定されていれば、そのチャンネルに投稿する', async () => {
        process.env.RECRUIT_CHANNEL_ID = 'channel-123'
        const commandChannelSend = jest.fn()
        const fixedChannelSend = jest.fn().mockResolvedValue(undefined)
        const fetchChannel = jest.fn().mockResolvedValue({ isSendable: () => true, send: fixedChannelSend })
        const interaction = mockModalInteraction('', {
          channel: { isSendable: () => true, send: commandChannelSend },
          client: { channels: { fetch: fetchChannel } }
        })

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(fetchChannel).toHaveBeenCalledWith('channel-123')
        expect(fixedChannelSend).toHaveBeenCalledTimes(1)
        expect(commandChannelSend).not.toHaveBeenCalled()
      })

      test('RECRUIT_CHANNEL_ID が空文字なら、コマンドを実行したチャンネルに投稿する', async () => {
        process.env.RECRUIT_CHANNEL_ID = ''
        const { channel, send } = mockChannel()
        const fetchChannel = jest.fn()
        const interaction = mockModalInteraction('', { channel, client: { channels: { fetch: fetchChannel } } })

        await handlerOf(CUSTOM_IDS.MODAL).execute(interaction)

        expect(fetchChannel).not.toHaveBeenCalled()
        expect(send).toHaveBeenCalledTimes(1)
      })

      test('投稿先が見つからなければ例外を投げ、成功の応答はしない', async () => {
        const interaction = mockModalInteraction('', { channel: null })

        await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow(
          '募集メッセージの投稿先チャンネルが見つからないか、送信できません'
        )
        expect(interaction.editReply).not.toHaveBeenCalled()
      })

      test('投稿先が送信できない種類のチャンネルなら例外を投げる', async () => {
        const interaction = mockModalInteraction('', { channel: { isSendable: () => false } })

        await expect(handlerOf(CUSTOM_IDS.MODAL).execute(interaction)).rejects.toThrow()
      })
    })
  })

  describe('参加ボタン・取り消しボタン', () => {
    /**
     * ボタンのインタラクションのモックを作る。
     *
     * @param userId - ボタンを押した人のユーザー ID
     * @param currentFileName - 投稿に付いている参加者画像のファイル名(付いていなければ undefined)
     * @param extra - モックに追加・上書きするプロパティ
     * @returns ボタンのインタラクションのモック
     */
    function mockButtonInteraction (
      userId: string,
      currentFileName: string | undefined,
      extra: Record<string, unknown> = {}
    ): any {
      return {
        user: mockUser(userId),
        message: { id: 'message-1' },
        deferUpdate: jest.fn().mockResolvedValue(undefined),
        fetchReply: jest.fn().mockResolvedValue(repliedMessage(currentFileName)),
        editReply: jest.fn().mockResolvedValue(undefined),
        followUp: jest.fn().mockResolvedValue(undefined),
        client: { users: { fetch: jest.fn(async (id: string) => mockUser(id)) } },
        ...extra
      }
    }

    /**
     * fetchReply が返す、募集メッセージのモックを作る。
     *
     * @param fileName - 投稿に付いている参加者画像のファイル名(付いていなければ undefined)
     * @param content - 投稿の本文(省略すると、「・募集した人」の行を含む、募集メッセージの本文)
     * @returns 募集メッセージのモック
     */
    function repliedMessage (fileName: string | undefined, content: string = RECRUIT_CONTENT): any {
      return { content, attachments: { first: () => fileName === undefined ? undefined : { name: fileName } } }
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

    describe('参加ボタン', () => {
      test('参加していない人が押すと、その人が末尾に加わり、画像が差し替えられる', async () => {
        const interaction = mockButtonInteraction('333', 'participants-100-200.png')

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.editReply).toHaveBeenCalledTimes(1)
        expect(editedFileName(interaction)).toBe('participants-100-200-333.png')
        // 古い画像を残さず、置き換える
        expect(interaction.editReply.mock.calls[0][0].attachments).toEqual([])
      })

      test('すでに参加している人が押すと、本人にだけ案内し、投稿は書き換えない', async () => {
        const interaction = mockButtonInteraction('200', 'participants-100-200.png')

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.followUp).toHaveBeenCalledWith({
          content: 'すでに参加しています。',
          flags: MessageFlags.Ephemeral
        })
        expect(interaction.editReply).not.toHaveBeenCalled()
      })

      test('参加者画像が付いていない投稿でも(全員が取り消したあと)、参加できる', async () => {
        const interaction = mockButtonInteraction('200', undefined)

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-200.png')
      })

      test('人数に上限はなく、9人目以降も参加でき、画像は2段になる', async () => {
        const eight = Array.from({ length: 8 }, (_, index) => `${index + 1}`)
        const interaction = mockButtonInteraction('999', `participants-${eight.join('-')}.png`)

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.followUp).not.toHaveBeenCalled()
        expect(editedFileName(interaction)).toBe(`participants-${eight.join('-')}-999.png`)
        const [{ attachment }] = interaction.editReply.mock.calls[0][0].files as Array<{ attachment: Buffer }>
        const { width, height } = await sharp(attachment).metadata()
        expect(width).toBe(ROW_WIDTH)
        expect(height).toBe(2 * AVATAR_SIZE + AVATAR_GAP)
      })
    })

    describe('取り消しボタン', () => {
      test('参加している人が押すと、その人が外れ、他の人の順番は変わらない', async () => {
        const interaction = mockButtonInteraction('200', 'participants-100-200-300.png')

        await handlerOf(CUSTOM_IDS.LEAVE_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-100-300.png')
        expect(interaction.editReply.mock.calls[0][0].attachments).toEqual([])
      })

      test('募集した人も、取り消せる', async () => {
        const interaction = mockButtonInteraction(POSTER_ID, 'participants-100-200.png')

        await handlerOf(CUSTOM_IDS.LEAVE_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-200.png')
      })

      test('参加していない人が押すと、本人にだけ案内し、投稿は書き換えない', async () => {
        const interaction = mockButtonInteraction('300', 'participants-100-200.png')

        await handlerOf(CUSTOM_IDS.LEAVE_BUTTON).execute(interaction)

        expect(interaction.followUp).toHaveBeenCalledWith({
          content: '参加していません。',
          flags: MessageFlags.Ephemeral
        })
        expect(interaction.editReply).not.toHaveBeenCalled()
      })

      test('最後の1人が取り消すと、参加者画像を投稿から外す(新しい画像は付けない)', async () => {
        const interaction = mockButtonInteraction('100', 'participants-100.png')

        await handlerOf(CUSTOM_IDS.LEAVE_BUTTON).execute(interaction)

        expect(interaction.editReply).toHaveBeenCalledTimes(1)
        expect(interaction.editReply).toHaveBeenCalledWith({ attachments: [] })
      })
    })

    describe('参加・取り消し共通の処理', () => {
      test.each([
        ['参加', CUSTOM_IDS.JOIN_BUTTON, '300'],
        ['取り消し', CUSTOM_IDS.LEAVE_BUTTON, '200']
      ])('%sでは、画像の作成より先に、受け付けたことを Discord に返す(3秒の応答期限のため)', async (_name, customId, userId) => {
        const interaction = mockButtonInteraction(userId, 'participants-100-200.png')

        await handlerOf(customId).execute(interaction)

        const deferOrder = interaction.deferUpdate.mock.invocationCallOrder[0]
        expect(deferOrder).toBeLessThan(interaction.fetchReply.mock.invocationCallOrder[0])
        expect(deferOrder).toBeLessThan(interaction.editReply.mock.invocationCallOrder[0])
      })

      test.each([
        ['参加', CUSTOM_IDS.JOIN_BUTTON],
        ['取り消し', CUSTOM_IDS.LEAVE_BUTTON]
      ])('絵文字だけに書き換えられた(終了した)募集では、%sできず、本人にだけ案内して、投稿は書き換えない', async (_name, customId) => {
        const interaction = mockButtonInteraction('200', undefined)
        interaction.fetchReply.mockResolvedValue(repliedMessage('participants-100-200.png', '💣'))

        await handlerOf(customId).execute(interaction)

        expect(interaction.followUp).toHaveBeenCalledWith({
          content: 'この募集は終了しています。',
          flags: MessageFlags.Ephemeral
        })
        expect(interaction.editReply).not.toHaveBeenCalled()
        expect(interaction.client.users.fetch).not.toHaveBeenCalled()
      })

      test('「募集した人」の行が、本文にない投稿(想定外の投稿)は、終了した募集と同じ扱いになる', async () => {
        const interaction = mockButtonInteraction('200', undefined)
        interaction.fetchReply.mockResolvedValue(repliedMessage('participants-100.png', '@everyone おる？'))

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.editReply).not.toHaveBeenCalled()
      })

      test('他の参加者のユーザー情報は取得し、押した本人は取得し直さない', async () => {
        const interaction = mockButtonInteraction('333', 'participants-100-200.png')

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.client.users.fetch).toHaveBeenCalledTimes(2)
        expect(interaction.client.users.fetch).toHaveBeenCalledWith('100')
        expect(interaction.client.users.fetch).toHaveBeenCalledWith('200')
      })

      test('参加者全員のアイコンを、256px の PNG(静止画)でダウンロードする', async () => {
        const interaction = mockButtonInteraction('333', 'participants-100.png')

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(interaction.user.displayAvatarURL).toHaveBeenCalledWith({
          extension: 'png',
          size: 256,
          forceStatic: true
        })
        expect(globalThis.fetch).toHaveBeenCalledWith(avatarUrl('100'))
        expect(globalThis.fetch).toHaveBeenCalledWith(avatarUrl('333'))
      })

      test('アイコン画像のダウンロードに失敗しても、投稿は更新される', async () => {
        jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))
        const interaction = mockButtonInteraction('200', 'participants-100.png')

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-100-200.png')
      })

      test('他の参加者のユーザー情報を取得できなくても、その人は参加者のまま保持される', async () => {
        const interaction = mockButtonInteraction('200', 'participants-100.png')
        interaction.client.users.fetch.mockRejectedValue(new Error('Unknown User'))

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-100-200.png')
      })

      test('投稿は、ボタンを押した時点のスナップショットではなく、最新の状態を読み直して更新する', async () => {
        const interaction = mockButtonInteraction('300', 'participants-100.png', {
          // 押した時点の投稿は古い(参加者が1人)が、最新の投稿には別の人も参加している
          message: { id: 'message-1', attachments: { first: () => ({ name: 'participants-100.png' }) } }
        })
        interaction.fetchReply.mockResolvedValue(repliedMessage('participants-100-200.png'))

        await handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(interaction)

        expect(editedFileName(interaction)).toBe('participants-100-200-300.png')
      })

      test('同じ投稿への同時の操作でも、参加者の一覧が上書きし合わず、すべて反映される', async () => {
        // 投稿の状態を共有し、読み取りと書き込みに時間がかかる状況を再現する
        const post: { fileName: string | undefined } = { fileName: 'participants-100.png' }
        const delay = async (): Promise<void> => await new Promise((resolve) => setTimeout(resolve, 10))
        const overrides = {
          fetchReply: jest.fn(async () => {
            await delay()
            return repliedMessage(post.fileName)
          }),
          editReply: jest.fn(async (options: { files?: Array<{ name: string }> }) => {
            await delay()
            post.fileName = options.files?.[0].name
          })
        }
        const join200 = mockButtonInteraction('200', undefined, overrides)
        const join300 = mockButtonInteraction('300', undefined, overrides)
        const leave100 = mockButtonInteraction('100', undefined, overrides)

        await Promise.all([
          handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(join200),
          handlerOf(CUSTOM_IDS.JOIN_BUTTON).execute(join300),
          handlerOf(CUSTOM_IDS.LEAVE_BUTTON).execute(leave100)
        ])

        expect(post.fileName).toBe('participants-200-300.png')
      })
    })
  })
})

import { GatewayIntentBits, Partials } from 'discord.js'
import feature from '../../../src/features/smashRecruit/index.js'

describe('募集機能の窓口(index.ts)', () => {
  test('コマンドは /smash-recruit の1つ', () => {
    expect(feature.commands?.map((command) => command.data.name)).toEqual(['smash-recruit'])
  })

  test('コンポーネントは、モーダル・参加・取り消しの3つ', () => {
    expect(feature.components?.map((component) => component.customId).sort()).toEqual([
      'smash-recruit:join',
      'smash-recruit:leave',
      'smash-recruit:modal'
    ])
  })

  test('リアクションの追加(messageReactionAdd)を受け取る', () => {
    expect(feature.events?.map((handler) => handler.event)).toEqual(['messageReactionAdd'])
  })

  test('リアクションを受け取るためのインテントを要求する(特権のインテントは要求しない)', () => {
    expect(feature.intents).toEqual([GatewayIntentBits.GuildMessageReactions])
    expect(feature.intents).not.toContain(GatewayIntentBits.MessageContent)
    expect(feature.intents).not.toContain(GatewayIntentBits.GuildMembers)
  })

  test('Bot の再起動前の投稿へのリアクションも受け取れるよう、partials を要求する', () => {
    expect(feature.partials).toEqual(expect.arrayContaining([
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User
    ]))
  })
})

describe('起動時の、RECRUIT_END_EMOJI_ID の警告', () => {
  const originalIds = process.env.RECRUIT_END_EMOJI_ID

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalIds === undefined) {
      delete process.env.RECRUIT_END_EMOJI_ID
    } else {
      process.env.RECRUIT_END_EMOJI_ID = originalIds
    }
  })

  /**
   * 環境変数を設定して、機能の窓口を読み込み直し、出力された警告を返す。
   *
   * @param value - RECRUIT_END_EMOJI_ID の値(未設定なら undefined)
   * @returns console.warn に渡された最初の引数の一覧
   */
  function loadAndCollectWarnings (value: string | undefined): string[] {
    if (value === undefined) {
      delete process.env.RECRUIT_END_EMOJI_ID
    } else {
      process.env.RECRUIT_END_EMOJI_ID = value
    }
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    jest.isolateModules(() => {
      require('../../../src/features/smashRecruit/index.js')
    })

    return warn.mock.calls.map((call) => String(call[0]))
  }

  test.each([undefined, '', '555', '555,556', ' 555 , 556 '])('設定が %j のとき、警告は出ない', (value) => {
    expect(loadAndCollectWarnings(value)).toEqual([])
  })

  test.each(['555;556', '555 556', 'abc'])('設定が %j のように、読み取れない値を含むとき、その値を示す警告が出る', (value) => {
    const warnings = loadAndCollectWarnings(value)

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('RECRUIT_END_EMOJI_ID')
    expect(warnings[0]).toContain(value)
  })
})

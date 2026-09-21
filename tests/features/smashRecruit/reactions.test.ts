import {
  findInvalidEmojiTokens,
  handleReactionAdd,
  isEndEmoji,
  parseEmojiIds,
  reactionAddHandler
} from '../../../src/features/smashRecruit/reactions.js'
import { runExclusive } from '../../../src/utils/keyedLock.js'

/** 募集した人のユーザー ID */
const POSTER_ID = '100'
/** Bot 自身のユーザー ID */
const BOT_ID = '900'

/** 投稿済みの募集メッセージの本文 */
const RECRUIT_CONTENT = [
  '@everyone おる？',
  '・対戦形式：個人戦',
  '・ステージギミック：なし',
  '・アイテム：なし',
  '・希望開始時間：23:00',
  `・募集した人：<@${POSTER_ID}>`,
  '・参加者'
].join('\n')

/** 標準の絵文字 💣 */
const bomb = { id: null, name: '💣', toString: () => '💣' }

/**
 * サーバー独自の絵文字を作る。
 *
 * @param id - 絵文字の ID
 * @param name - 絵文字の名前
 * @returns 絵文字のモック
 */
function customEmoji (id: string, name = 'bomb'): { id: string, name: string, toString: () => string } {
  return { id, name, toString: () => `<:${name}:${id}>` }
}

/** リアクションの場面の組み立て方 */
interface ScenarioOptions {
  emoji?: { id: string | null, name: string | null, toString: () => string }
  user?: { id: string, bot: boolean }
  author?: string
  content?: string
}

/**
 * リアクションが付いた場面のモックを作る。
 *
 * @param options - 場面の組み立て方(省略した項目は、募集した人が、Bot の募集メッセージに 💣 を付ける場面)
 * @returns リアクションとユーザーのモックと、呼び出しの記録
 */
function scenario (options: ScenarioOptions = {}): {
  reaction: any
  user: any
  message: any
  fetch: jest.Mock
  edit: jest.Mock
  removeAll: jest.Mock
} {
  const edit = jest.fn().mockResolvedValue(undefined)
  const removeAll = jest.fn().mockResolvedValue(undefined)
  const message = {
    id: 'message-1',
    author: { id: options.author ?? BOT_ID },
    client: { user: { id: BOT_ID } },
    content: options.content ?? RECRUIT_CONTENT,
    edit,
    reactions: { removeAll }
  }
  const fetch = jest.fn().mockResolvedValue(message)
  return {
    reaction: { emoji: options.emoji ?? bomb, message: { id: 'message-1', fetch } },
    user: options.user ?? { id: POSTER_ID, bot: false },
    message,
    fetch,
    edit,
    removeAll
  }
}

describe('parseEmojiIds', () => {
  test.each([
    [undefined, []],
    ['', []],
    ['   ', []],
    ['555', ['555']],
    ['555,556', ['555', '556']],
    [' 555 , 556 ,, ', ['555', '556']],
    ['<:bomb:555>,<a:dance:556>', ['555', '556']],
    ['555;556', []],
    ['555 556', []],
    ['abc,557', ['557']]
  ])('%j から、絵文字の ID の一覧を取り出す', (value, expected) => {
    expect(parseEmojiIds(value)).toEqual(expected)
  })
})

describe('findInvalidEmojiTokens', () => {
  test.each([
    [undefined, []],
    ['', []],
    ['555,556', []],
    ['<:bomb:555>', []],
    [' 555 , 556 ,, ', []],
    ['555;556', ['555;556']],
    ['555 556', ['555 556']],
    ['abc,557,def', ['abc', 'def']]
  ])('%j のうち、ID として読み取れない項目を返す', (value, expected) => {
    expect(findInvalidEmojiTokens(value)).toEqual(expected)
  })
})

describe('isEndEmoji', () => {
  test('標準の絵文字 💣 は、設定にかかわらず、あてはまる', () => {
    expect(isEndEmoji(bomb, [])).toBe(true)
    expect(isEndEmoji(bomb, ['555'])).toBe(true)
  })

  test('異体字セレクタ付きの 💣 も、あてはまる', () => {
    expect(isEndEmoji({ id: null, name: '💣️' }, [])).toBe(true)
  })

  test.each(['👍', '💥', '', null])('それ以外の標準の絵文字(%j)は、あてはまらない', (name) => {
    expect(isEndEmoji({ id: null, name }, ['555'])).toBe(false)
  })

  test('サーバー独自の絵文字は、指定された ID のものだけが、あてはまる(複数指定できる)', () => {
    expect(isEndEmoji({ id: '555', name: 'a' }, ['555', '556'])).toBe(true)
    expect(isEndEmoji({ id: '556', name: 'b' }, ['555', '556'])).toBe(true)
    expect(isEndEmoji({ id: '557', name: 'c' }, ['555', '556'])).toBe(false)
  })

  test('ID が未指定なら、サーバー独自の絵文字は、名前が 💣 でも、あてはまらない', () => {
    expect(isEndEmoji({ id: '555', name: '💣' }, [])).toBe(false)
  })
})

describe('handleReactionAdd', () => {
  const originalIds = process.env.RECRUIT_END_EMOJI_ID

  beforeEach(() => {
    delete process.env.RECRUIT_END_EMOJI_ID
  })

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalIds === undefined) {
      delete process.env.RECRUIT_END_EMOJI_ID
    } else {
      process.env.RECRUIT_END_EMOJI_ID = originalIds
    }
  })

  describe('書き換える場面', () => {
    test('募集した人が 💣 を付けると、内容が 💣 だけになり、参加者画像とボタンが外れる', async () => {
      const { reaction, user, edit } = scenario()

      await handleReactionAdd(reaction, user)

      expect(edit).toHaveBeenCalledTimes(1)
      expect(edit).toHaveBeenCalledWith({ content: '💣', attachments: [], components: [] })
    })

    test('書き換えたあと、その投稿のリアクションを、すべて外す', async () => {
      const { reaction, user, edit, removeAll } = scenario()

      await handleReactionAdd(reaction, user)

      expect(removeAll).toHaveBeenCalledTimes(1)
      expect(edit.mock.invocationCallOrder[0]).toBeLessThan(removeAll.mock.invocationCallOrder[0])
    })

    test('サーバー独自の絵文字を付けると、内容が、その絵文字だけになる', async () => {
      process.env.RECRUIT_END_EMOJI_ID = '555'
      const { reaction, user, edit } = scenario({ emoji: customEmoji('555', 'bakudan') })

      await handleReactionAdd(reaction, user)

      expect(edit).toHaveBeenCalledWith({ content: '<:bakudan:555>', attachments: [], components: [] })
    })

    test('サーバー独自の絵文字を複数指定したとき、どれを付けても、書き換わる', async () => {
      process.env.RECRUIT_END_EMOJI_ID = '555, 556'

      for (const id of ['555', '556']) {
        const { reaction, user, edit } = scenario({ emoji: customEmoji(id, `e${id}`) })

        await handleReactionAdd(reaction, user)

        expect(edit).toHaveBeenCalledWith({ content: `<:e${id}:${id}>`, attachments: [], components: [] })
      }
    })

    test('サーバー独自の絵文字を指定していても、💣 は使える', async () => {
      process.env.RECRUIT_END_EMOJI_ID = '555'
      const { reaction, user, edit } = scenario()

      await handleReactionAdd(reaction, user)

      expect(edit).toHaveBeenCalledWith({ content: '💣', attachments: [], components: [] })
    })

    test('募集文に偽の「募集した人」の行が書かれていても、本物の募集した人だけが書き換えられる', async () => {
      const content = RECRUIT_CONTENT.replace('@everyone おる？', '@everyone よろしく\n・募集した人：<@200>')

      const fake = scenario({ user: { id: '200', bot: false }, content })
      await handleReactionAdd(fake.reaction, fake.user)
      const real = scenario({ content })
      await handleReactionAdd(real.reaction, real.user)

      expect(fake.edit).not.toHaveBeenCalled()
      expect(real.edit).toHaveBeenCalledTimes(1)
    })
  })

  describe('何もしない場面', () => {
    test('他の人が付けても、書き換えず、リアクションも外さない', async () => {
      const { reaction, user, edit, removeAll } = scenario({ user: { id: '200', bot: false } })

      await handleReactionAdd(reaction, user)

      expect(edit).not.toHaveBeenCalled()
      expect(removeAll).not.toHaveBeenCalled()
    })

    test('Bot が付けたリアクションには、投稿を取得することもなく、何もしない', async () => {
      const { reaction, user, fetch, edit } = scenario({ user: { id: BOT_ID, bot: true } })

      await handleReactionAdd(reaction, user)

      expect(fetch).not.toHaveBeenCalled()
      expect(edit).not.toHaveBeenCalled()
    })

    test.each([
      ['標準の別の絵文字', { id: null, name: '👍', toString: () => '👍' }],
      ['指定していないサーバー独自の絵文字', customEmoji('999')]
    ])('%sには、投稿を取得することもなく、何もしない', async (_name, emoji) => {
      const { reaction, user, fetch, edit } = scenario({ emoji })

      await handleReactionAdd(reaction, user)

      expect(fetch).not.toHaveBeenCalled()
      expect(edit).not.toHaveBeenCalled()
    })

    test('Bot 以外の人の投稿には、何もしない', async () => {
      const { reaction, user, edit, removeAll } = scenario({ author: '777' })

      await handleReactionAdd(reaction, user)

      expect(edit).not.toHaveBeenCalled()
      expect(removeAll).not.toHaveBeenCalled()
    })

    test('募集メッセージではない Bot の投稿には、何もしない', async () => {
      const { reaction, user, edit } = scenario({ content: 'ただのお知らせ' })

      await handleReactionAdd(reaction, user)

      expect(edit).not.toHaveBeenCalled()
    })

    test('すでに絵文字だけに書き換えられた投稿には、何もしない', async () => {
      const { reaction, user, edit, removeAll } = scenario({ content: '💣' })

      await handleReactionAdd(reaction, user)

      expect(edit).not.toHaveBeenCalled()
      expect(removeAll).not.toHaveBeenCalled()
    })
  })

  describe('失敗したとき', () => {
    test('リアクションを外せなくても、例外にせず、原因が分かる警告を出す(書き換えは済んでいる)', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const { reaction, user, edit, removeAll } = scenario()
      removeAll.mockRejectedValue(new Error('Missing Permissions'))

      await expect(handleReactionAdd(reaction, user)).resolves.toBeUndefined()

      expect(edit).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('「メッセージの管理」権限')
    })

    test('書き換えに失敗したら、例外を投げ、リアクションは外さない', async () => {
      const { reaction, user, edit, removeAll } = scenario()
      edit.mockRejectedValue(new Error('Missing Access'))

      await expect(handleReactionAdd(reaction, user)).rejects.toThrow('Missing Access')

      expect(removeAll).not.toHaveBeenCalled()
    })
  })

  test('同じ投稿への参加ボタンなどの処理が終わるのを待ってから、書き換える(上書きし合わないように)', async () => {
    const events: string[] = []
    const { reaction, user, edit } = scenario()
    edit.mockImplementation(async () => { events.push('書き換え') })

    const button = runExclusive('message-1', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      events.push('ボタンの処理')
    })
    await Promise.all([button, handleReactionAdd(reaction, user)])

    expect(events).toEqual(['ボタンの処理', '書き換え'])
  })
})

describe('reactionAddHandler', () => {
  test('リアクションの追加(messageReactionAdd)を受け取る処理として、定義されている', () => {
    expect(reactionAddHandler.event).toBe('messageReactionAdd')
  })

  test('イベントの引数を、そのまま handleReactionAdd に渡して処理する', async () => {
    const { reaction, user, edit } = scenario()

    await reactionAddHandler.execute(reaction, user)

    expect(edit).toHaveBeenCalledTimes(1)
  })
})

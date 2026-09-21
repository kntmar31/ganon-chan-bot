import { buildPosterLine, parsePosterId } from '../../../src/features/smashRecruit/poster.js'

/**
 * 募集メッセージの本文を作る。
 *
 * @param freeText - 1行目に入る募集文
 * @param posterId - 募集した人のユーザー ID
 * @returns 募集メッセージの本文
 */
function recruitContent (freeText: string, posterId: string): string {
  return [
    `@everyone ${freeText}`,
    '・対戦形式：個人戦',
    '・ステージギミック：なし',
    '・アイテム：なし',
    '・希望開始時間：23:00',
    buildPosterLine(`<@${posterId}>`),
    '・参加者'
  ].join('\n')
}

describe('buildPosterLine', () => {
  test('「・募集した人：」に、メンションを続けた行になる', () => {
    expect(buildPosterLine('<@100>')).toBe('・募集した人：<@100>')
  })
})

describe('parsePosterId', () => {
  test('募集メッセージの本文から、募集した人のユーザー ID を読み取る', () => {
    expect(parsePosterId(recruitContent('おる？', '123456789012345678'))).toBe('123456789012345678')
  })

  test('buildPosterLine で作った行を、元のユーザー ID に戻せる', () => {
    expect(parsePosterId(buildPosterLine('<@987654321098765432>'))).toBe('987654321098765432')
  })

  test('ニックネーム形式のメンション(<@!ID>)からも読み取れる', () => {
    expect(parsePosterId('・募集した人：<@!100>')).toBe('100')
  })

  test('募集文に改行があっても、読み取れる', () => {
    expect(parsePosterId(recruitContent('初心者歓迎！\n20時から', '100'))).toBe('100')
  })

  test('募集文に「募集した人」の偽の行が書かれていても、本物の行(最後に見つかった行)を採用する', () => {
    const spoofed = recruitContent('よろしく\n・募集した人：<@999>', '100')

    expect(parsePosterId(spoofed)).toBe('100')
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['空文字', ''],
    ['絵文字だけに書き換えられた本文', '💣'],
    ['サーバー独自の絵文字だけの本文', '<:bomb:555>'],
    ['募集した人の行がない本文', '@everyone おる？\n・対戦形式：個人戦'],
    ['行の途中にあるだけ', '今日の・募集した人：<@100>'],
    ['行の前に空白がある', ' ・募集した人：<@100>'],
    ['行の後ろに文字が続く', '・募集した人：<@100> です'],
    ['メンションの形でない', '・募集した人：100'],
    ['ロールのメンション', '・募集した人：<@&100>']
  ])('募集した人を読み取れない本文(%s)からは、undefined を返す', (_name, content) => {
    expect(parsePosterId(content)).toBeUndefined()
  })
})

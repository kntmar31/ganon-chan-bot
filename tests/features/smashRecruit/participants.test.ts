import {
  buildParticipantsFileName,
  parseParticipantIds,
  toggleParticipant
} from '../../../src/features/smashRecruit/participants.js'

describe('buildParticipantsFileName', () => {
  test('参加者がいなければ participants.png', () => {
    expect(buildParticipantsFileName([])).toBe('participants.png')
  })

  test('参加者の ID を、参加した順にハイフンでつなぐ', () => {
    expect(buildParticipantsFileName(['111', '222'])).toBe('participants-111-222.png')
  })
})

describe('parseParticipantIds', () => {
  test.each([
    ['participants.png', []],
    ['participants-111.png', ['111']],
    ['participants-111-222-333.png', ['111', '222', '333']]
  ])('%s から参加者の一覧を取り出す', (fileName, expected) => {
    expect(parseParticipantIds(fileName)).toEqual(expected)
  })

  test('buildParticipantsFileName の結果を、元の一覧に戻せる', () => {
    const ids = ['123456789012345678', '987654321098765432']

    expect(parseParticipantIds(buildParticipantsFileName(ids))).toEqual(ids)
  })

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['空文字', ''],
    ['接頭辞が違う', 'other-111.png'],
    ['拡張子が違う', 'participants-111.jpg'],
    ['拡張子がない', 'participants-111']
  ])('想定した形でないファイル名(%s)からは、空の一覧を返す', (_name, fileName) => {
    expect(parseParticipantIds(fileName)).toEqual([])
  })

  test('数字でない要素は無視する', () => {
    expect(parseParticipantIds('participants-111-abc-222.png')).toEqual(['111', '222'])
  })
})

describe('toggleParticipant', () => {
  test('参加していない人が押すと、末尾に追加される', () => {
    expect(toggleParticipant(['111'], '222', 8)).toEqual({ ids: ['111', '222'], result: 'joined' })
  })

  test('参加者がいない状態でも、追加できる', () => {
    expect(toggleParticipant([], '111', 8)).toEqual({ ids: ['111'], result: 'joined' })
  })

  test('参加済みの人が押すと、取り消される(他の人の順番は変わらない)', () => {
    expect(toggleParticipant(['111', '222', '333'], '222', 8)).toEqual({
      ids: ['111', '333'],
      result: 'left'
    })
  })

  test('定員に達していれば、追加されず、満員になる', () => {
    expect(toggleParticipant(['111', '222'], '333', 2)).toEqual({
      ids: ['111', '222'],
      result: 'full'
    })
  })

  test('定員に達していても、参加済みの人は取り消せる', () => {
    expect(toggleParticipant(['111', '222'], '222', 2)).toEqual({ ids: ['111'], result: 'left' })
  })

  test('元の配列は書き換えない', () => {
    const ids = ['111']

    toggleParticipant(ids, '222', 8)

    expect(ids).toEqual(['111'])
  })
})

import {
  addParticipant,
  buildParticipantsFileName,
  parseParticipantIds,
  removeParticipant
} from '../../../src/features/smashRecruit/participants.js'

describe('buildParticipantsFileName', () => {
  test('参加者の ID を、参加した順にハイフンでつなぐ', () => {
    expect(buildParticipantsFileName(['111', '222'])).toBe('participants-111-222.png')
  })

  test('参加者が1人なら、その人の ID だけがつく', () => {
    expect(buildParticipantsFileName(['111'])).toBe('participants-111.png')
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

  test('9人以上(1列に収まらない人数)でも、元の一覧に戻せる', () => {
    const ids = Array.from({ length: 30 }, (_, index) => `${100000000000000000 + index}`)

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

describe('addParticipant', () => {
  test('参加していない人は、末尾に追加される', () => {
    expect(addParticipant(['111'], '222')).toEqual({ ids: ['111', '222'], changed: true })
  })

  test('参加者がいない状態でも、追加できる', () => {
    expect(addParticipant([], '111')).toEqual({ ids: ['111'], changed: true })
  })

  test('すでに参加している人は、追加されず、一覧は変わらない', () => {
    expect(addParticipant(['111', '222'], '111')).toEqual({ ids: ['111', '222'], changed: false })
  })

  test('人数の上限はない(何人でも追加できる)', () => {
    const many = Array.from({ length: 100 }, (_, index) => `${index + 1}`)

    expect(addParticipant(many, '999')).toEqual({ ids: [...many, '999'], changed: true })
  })

  test('元の配列は書き換えない', () => {
    const ids = ['111']

    addParticipant(ids, '222')

    expect(ids).toEqual(['111'])
  })
})

describe('removeParticipant', () => {
  test('参加している人は、一覧から外れる(他の人の順番は変わらない)', () => {
    expect(removeParticipant(['111', '222', '333'], '222')).toEqual({
      ids: ['111', '333'],
      changed: true
    })
  })

  test('最後の1人を外すと、空の一覧になる', () => {
    expect(removeParticipant(['111'], '111')).toEqual({ ids: [], changed: true })
  })

  test('参加していない人は、何も変わらない', () => {
    expect(removeParticipant(['111', '222'], '333')).toEqual({ ids: ['111', '222'], changed: false })
  })

  test('元の配列は書き換えない', () => {
    const ids = ['111', '222']

    removeParticipant(ids, '111')

    expect(ids).toEqual(['111', '222'])
  })
})

import { isComplete } from '../../../src/features/smashRecruit/types.js'

describe('isComplete', () => {
  test('3項目すべて選択済みなら true', () => {
    expect(isComplete({ mode: 'team', gimmick: 'on', item: 'off' })).toBe(true)
  })

  test('undefined なら false', () => {
    expect(isComplete(undefined)).toBe(false)
  })

  test('空の状態なら false', () => {
    expect(isComplete({})).toBe(false)
  })

  test.each([
    ['mode', { gimmick: 'on', item: 'off' }],
    ['gimmick', { mode: 'team', item: 'off' }],
    ['item', { mode: 'team', gimmick: 'on' }]
  ] as const)('%s だけ未選択なら false', (_missing, state) => {
    expect(isComplete(state)).toBe(false)
  })
})

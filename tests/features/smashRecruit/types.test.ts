import { isModeKey, isToggleKey } from '../../../src/features/smashRecruit/types.js'

describe('isModeKey', () => {
  test.each(['individual', 'team', 'both'])('%s は対戦形式の選択値', (value) => {
    expect(isModeKey(value)).toBe(true)
  })

  test.each([
    ['未定義の文字列', 'unknown'],
    ['空文字', ''],
    ['あり/なしの値', 'on'],
    ['オブジェクトのプロパティ名', 'toString'],
    ['null', null],
    ['undefined', undefined],
    ['数値', 1]
  ])('%s は対戦形式の選択値ではない', (_name, value) => {
    expect(isModeKey(value)).toBe(false)
  })
})

describe('isToggleKey', () => {
  test.each(['on', 'off'])('%s は「あり/なし」の選択値', (value) => {
    expect(isToggleKey(value)).toBe(true)
  })

  test.each([
    ['未定義の文字列', 'maybe'],
    ['空文字', ''],
    ['対戦形式の値', 'team'],
    ['オブジェクトのプロパティ名', 'constructor'],
    ['null', null],
    ['undefined', undefined],
    ['真偽値', true]
  ])('%s は「あり/なし」の選択値ではない', (_name, value) => {
    expect(isToggleKey(value)).toBe(false)
  })
})

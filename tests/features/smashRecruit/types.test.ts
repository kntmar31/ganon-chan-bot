import { isModeKey, isStartTimeKey } from '../../../src/features/smashRecruit/types.js'

describe('isModeKey', () => {
  test.each(['individual', 'team', 'both'])('%s は対戦形式の選択値', (value) => {
    expect(isModeKey(value)).toBe(true)
  })

  test.each([
    ['未定義の文字列', 'unknown'],
    ['空文字', ''],
    ['あり/なしの値', 'on'],
    ['希望開始時間の値', '23:00'],
    ['オブジェクトのプロパティ名', 'toString'],
    ['null', null],
    ['undefined', undefined],
    ['数値', 1]
  ])('%s は対戦形式の選択値ではない', (_name, value) => {
    expect(isModeKey(value)).toBe(false)
  })
})

describe('isStartTimeKey', () => {
  test.each(['23:00', '23:30', '0:00', '0:30', '1:00', 'other'])('%s は希望開始時間の選択値', (value) => {
    expect(isStartTimeKey(value)).toBe(true)
  })

  test.each([
    ['選択肢にない時間', '24:00'],
    ['桁数が違う表記', '00:00'],
    ['空文字', ''],
    ['対戦形式の値', 'team'],
    ['オブジェクトのプロパティ名', 'constructor'],
    ['null', null],
    ['undefined', undefined],
    ['数値', 23]
  ])('%s は希望開始時間の選択値ではない', (_name, value) => {
    expect(isStartTimeKey(value)).toBe(false)
  })
})

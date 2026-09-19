import { CUSTOM_IDS } from '../../../src/features/smashRecruit/constants.js'
import { buildComponents, buildStatusLine } from '../../../src/features/smashRecruit/view.js'

/** ActionRowBuilder#toJSON() の結果のうち、テストで見る部分だけを表した型 */
interface RowJson {
  components: Array<Record<string, unknown>>
}

/**
 * buildComponents() の結果を、比較しやすい JSON の配列に変換する。
 *
 * @param state - 入力途中の状態
 * @returns 各行の JSON
 */
function buildRows (state: Parameters<typeof buildComponents>[0]): RowJson[] {
  return buildComponents(state).map((row) => row.toJSON() as unknown as RowJson)
}

describe('buildStatusLine', () => {
  test('何も選択していなければ3項目とも「未選択」と表示する', () => {
    const text = buildStatusLine({})

    expect(text).toContain('・対戦形式：未選択')
    expect(text).toContain('・ステージギミック：未選択')
    expect(text).toContain('・アイテム：未選択')
  })

  test('選択済みの項目はラベルで表示する', () => {
    const text = buildStatusLine({ mode: 'team', gimmick: 'on', item: 'off' })

    expect(text).toContain('・対戦形式：チーム戦')
    expect(text).toContain('・ステージギミック：あり')
    expect(text).toContain('・アイテム：なし')
  })

  test('一部だけ選択した場合は、未選択の項目だけ「未選択」になる', () => {
    const text = buildStatusLine({ mode: 'both' })

    expect(text).toContain('・対戦形式：両方OK')
    expect(text).toContain('・ステージギミック：未選択')
    expect(text).toContain('・アイテム：未選択')
  })
})

describe('buildComponents', () => {
  test('セレクトメニュー3行とボタン1行の計4行を返す', () => {
    const rows = buildRows({})

    expect(rows).toHaveLength(4)
    expect(rows.map((row) => row.components.length)).toEqual([1, 1, 1, 2])
  })

  test('セレクトメニューの customId が想定どおり', () => {
    const rows = buildRows({})

    expect(rows[0].components[0].custom_id).toBe(CUSTOM_IDS.SELECT_MODE)
    expect(rows[1].components[0].custom_id).toBe(CUSTOM_IDS.SELECT_GIMMICK)
    expect(rows[2].components[0].custom_id).toBe(CUSTOM_IDS.SELECT_ITEM)
  })

  test('選択済みの選択肢だけ default になる', () => {
    const rows = buildRows({ mode: 'team', gimmick: 'off' })

    const defaultsOf = (row: RowJson): unknown[] =>
      (row.components[0].options as Array<{ value: string, default: boolean }>)
        .filter((option) => option.default)
        .map((option) => option.value)

    expect(defaultsOf(rows[0])).toEqual(['team'])
    expect(defaultsOf(rows[1])).toEqual(['off'])
    expect(defaultsOf(rows[2])).toEqual([])
  })

  test('3項目が未選択の間は、投稿ボタンが無効になる', () => {
    const [, , , buttons] = buildRows({ mode: 'team', gimmick: 'on' })

    expect(buttons.components[0].custom_id).toBe(CUSTOM_IDS.SUBMIT_BUTTON)
    expect(buttons.components[0].disabled).toBe(true)
  })

  test('3項目すべて選択済みなら、投稿ボタンが有効になる', () => {
    const [, , , buttons] = buildRows({ mode: 'team', gimmick: 'on', item: 'off' })

    expect(buttons.components[0].disabled).toBe(false)
  })

  test('キャンセルボタンは常に有効', () => {
    const [, , , buttons] = buildRows({})

    expect(buttons.components[1].custom_id).toBe(CUSTOM_IDS.CANCEL_BUTTON)
    expect(buttons.components[1].disabled).toBeFalsy()
  })
})

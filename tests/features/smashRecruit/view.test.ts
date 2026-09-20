import { ComponentType } from 'discord.js'
import {
  CUSTOM_IDS,
  DEFAULT_SELECTION,
  MODE_LABELS,
  TOGGLE_LABELS
} from '../../../src/features/smashRecruit/constants.js'
import { buildRecruitModal } from '../../../src/features/smashRecruit/view.js'

/** モーダルの Label 1件分の JSON のうち、テストで見る部分だけを表した型 */
interface LabelJson {
  type: number
  label: string
  component: {
    type: number
    custom_id: string
    required?: boolean
    max_length?: number
    options?: Array<{ label: string, value: string, default?: boolean }>
  }
}

/**
 * buildRecruitModal() の結果を、比較しやすい JSON に変換する。
 *
 * @returns モーダルの JSON
 */
function buildModalJson (): { custom_id: string, title: string, components: LabelJson[] } {
  return buildRecruitModal().toJSON() as unknown as ReturnType<typeof buildModalJson>
}

describe('buildRecruitModal', () => {
  test('モーダルの customId とタイトルが想定どおり', () => {
    const modal = buildModalJson()

    expect(modal.custom_id).toBe(CUSTOM_IDS.MODAL)
    expect(modal.title).toBe('スマブラ募集')
  })

  test('対戦形式・ギミック・アイテム・募集文の4項目を、この順で並べる', () => {
    const { components } = buildModalJson()

    expect(components.map((item) => item.component.custom_id)).toEqual([
      CUSTOM_IDS.MODAL_MODE,
      CUSTOM_IDS.MODAL_GIMMICK,
      CUSTOM_IDS.MODAL_ITEM,
      CUSTOM_IDS.MODAL_TEXT_INPUT
    ])
    expect(components.every((item) => item.type === ComponentType.Label)).toBe(true)
  })

  test('3つの選択項目はラジオグループで、いずれも必須', () => {
    const radioGroups = buildModalJson().components.slice(0, 3)

    expect(radioGroups.map((item) => item.component.type)).toEqual([
      ComponentType.RadioGroup,
      ComponentType.RadioGroup,
      ComponentType.RadioGroup
    ])
    expect(radioGroups.map((item) => item.component.required)).toEqual([true, true, true])
  })

  test('選択肢の値とラベルが定数の定義と一致する', () => {
    const [mode, gimmick, item] = buildModalJson().components

    /**
     * 選択肢から、デフォルトの指定を除いた値とラベルだけを取り出す。
     *
     * @param label - モーダルの Label 1件分
     * @returns 値とラベルの配列
     */
    const valuesAndLabels = (label: LabelJson): Array<{ value: string, label: string }> =>
      (label.component.options ?? []).map(({ value, label }) => ({ value, label }))

    expect(valuesAndLabels(mode)).toEqual(
      Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))
    )
    expect(valuesAndLabels(gimmick)).toEqual(
      Object.entries(TOGGLE_LABELS).map(([value, label]) => ({ value, label }))
    )
    expect(valuesAndLabels(item)).toEqual(valuesAndLabels(gimmick))
  })

  test('最初から、個人戦・ギミックなし・アイテムなしが選択されている', () => {
    const [mode, gimmick, item] = buildModalJson().components

    /**
     * 最初から選択されている選択肢の値を取り出す。
     *
     * @param label - モーダルの Label 1件分
     * @returns デフォルトで選択されている値の配列
     */
    const defaultsOf = (label: LabelJson): string[] =>
      (label.component.options ?? []).filter((option) => option.default === true).map((option) => option.value)

    expect(defaultsOf(mode)).toEqual(['individual'])
    expect(defaultsOf(gimmick)).toEqual(['off'])
    expect(defaultsOf(item)).toEqual(['off'])
  })

  test('デフォルトの値は、すべて選択肢に存在する', () => {
    expect(Object.keys(MODE_LABELS)).toContain(DEFAULT_SELECTION.mode)
    expect(Object.keys(TOGGLE_LABELS)).toContain(DEFAULT_SELECTION.gimmick)
    expect(Object.keys(TOGGLE_LABELS)).toContain(DEFAULT_SELECTION.item)
  })

  test('項目名のラベルが表示される', () => {
    const labels = buildModalJson().components.map((item) => item.label)

    expect(labels.slice(0, 3)).toEqual(['対戦形式', 'ステージギミック', 'アイテム'])
  })

  test('募集文は任意入力の段落テキストで、300文字まで', () => {
    const text = buildModalJson().components[3].component

    expect(text.type).toBe(ComponentType.TextInput)
    expect(text.required).toBe(false)
    expect(text.max_length).toBe(300)
  })
})

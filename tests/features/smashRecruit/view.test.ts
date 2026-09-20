import { ButtonStyle, ComponentType, TextInputStyle } from 'discord.js'
import {
  CUSTOM_IDS,
  DEFAULT_SELECTION,
  MODE_LABELS,
  OPTION_CHECKBOXES,
  START_TIME_LABELS,
  TOGGLE_LABELS
} from '../../../src/features/smashRecruit/constants.js'
import { buildJoinRow, buildRecruitModal } from '../../../src/features/smashRecruit/view.js'

/** モーダルの選択肢1件分の JSON のうち、テストで見る部分だけを表した型 */
interface OptionJson {
  label: string
  value: string
  default?: boolean
}

/** モーダルの Label 1件分の JSON のうち、テストで見る部分だけを表した型 */
interface LabelJson {
  type: number
  label: string
  description?: string
  component: {
    type: number
    custom_id: string
    required?: boolean
    min_values?: number
    max_length?: number
    style?: number
    placeholder?: string
    options?: OptionJson[]
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

/**
 * 選択肢から、デフォルトの指定を除いた値とラベルだけを取り出す。
 *
 * @param label - モーダルの Label 1件分
 * @returns 値とラベルの配列
 */
function valuesAndLabels (label: LabelJson): Array<{ value: string, label: string }> {
  return (label.component.options ?? []).map(({ value, label }) => ({ value, label }))
}

/**
 * 最初から選択(チェック)されている選択肢の値を取り出す。
 *
 * @param label - モーダルの Label 1件分
 * @returns デフォルトで選択されている値の配列
 */
function defaultsOf (label: LabelJson): string[] {
  return (label.component.options ?? []).filter((option) => option.default === true).map((option) => option.value)
}

describe('buildRecruitModal', () => {
  test('モーダルの customId とタイトルが想定どおり', () => {
    const modal = buildModalJson()

    expect(modal.custom_id).toBe(CUSTOM_IDS.MODAL)
    expect(modal.title).toBe('スマブラ募集')
  })

  test('対戦形式・ステージギミック/アイテム・希望開始時間・募集文の4項目を、この順で並べる', () => {
    const { components } = buildModalJson()

    expect(components.map((item) => item.component.custom_id)).toEqual([
      CUSTOM_IDS.MODAL_MODE,
      CUSTOM_IDS.MODAL_OPTIONS,
      CUSTOM_IDS.MODAL_START_TIME,
      CUSTOM_IDS.MODAL_TEXT_INPUT
    ])
    expect(components.every((item) => item.type === ComponentType.Label)).toBe(true)
  })

  test('部品の数が、Discord のモーダルの上限(5個)を超えない', () => {
    expect(buildModalJson().components.length).toBeLessThanOrEqual(5)
  })

  describe('対戦形式', () => {
    test('必須のラジオグループで、項目名が付く', () => {
      const [mode] = buildModalJson().components

      expect(mode.label).toBe('対戦形式')
      expect(mode.component.type).toBe(ComponentType.RadioGroup)
      expect(mode.component.required).toBe(true)
    })

    test('選択肢の値とラベルが定数の定義と一致し、「両方」は「個人戦 / チーム戦 どちらも」と表示される', () => {
      const [mode] = buildModalJson().components

      expect(valuesAndLabels(mode)).toEqual(
        Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))
      )
      expect(MODE_LABELS.both).toBe('個人戦 / チーム戦 どちらも')
    })

    test('最初から、個人戦が選択されている', () => {
      const [mode] = buildModalJson().components

      expect(defaultsOf(mode)).toEqual(['individual'])
    })
  })

  describe('ステージギミック・アイテム', () => {
    test('必須ではないチェックボックスグループで、最小の選択数は0(何もチェックしなくても送信できる)', () => {
      const [, options] = buildModalJson().components

      expect(options.component.type).toBe(ComponentType.CheckboxGroup)
      expect(options.component.required).toBe(false)
      expect(options.component.min_values).toBe(0)
    })

    test('項目名と説明が付く', () => {
      const [, options] = buildModalJson().components

      expect(options.label).toBe('ステージギミック・アイテム')
      expect(options.description).toBe('チェックしたものが「あり」になります(チェックなしは「なし」)')
    })

    test('「ステージギミックあり」「アイテムあり」の2つのチェックボックスが、この順に並ぶ', () => {
      const [, options] = buildModalJson().components

      expect(valuesAndLabels(options)).toEqual([
        { value: OPTION_CHECKBOXES.gimmick.value, label: 'ステージギミックあり' },
        { value: OPTION_CHECKBOXES.item.value, label: 'アイテムあり' }
      ])
    })

    test('最初は、どちらもチェックされていない(なし・なし)', () => {
      const [, options] = buildModalJson().components

      expect(defaultsOf(options)).toEqual([])
      expect(DEFAULT_SELECTION.gimmick).toBe('off')
      expect(DEFAULT_SELECTION.item).toBe('off')
    })

    test('「なし」「あり」の表示は、定数で「なし」→「あり」の順に定義されている', () => {
      expect(Object.values(TOGGLE_LABELS)).toEqual(['なし', 'あり'])
    })
  })

  describe('希望開始時間', () => {
    test('必須のセレクトメニューで、項目名が付く', () => {
      const [, , startTime] = buildModalJson().components

      expect(startTime.label).toBe('希望開始時間')
      expect(startTime.component.type).toBe(ComponentType.StringSelect)
      expect(startTime.component.required).toBe(true)
    })

    test('選択肢は、23:00 / 23:30 / 0:00 / 0:30 / 1:00 / その他 の順に並ぶ', () => {
      const [, , startTime] = buildModalJson().components

      expect(valuesAndLabels(startTime).map((option) => option.label)).toEqual([
        '23:00',
        '23:30',
        '0:00',
        '0:30',
        '1:00',
        'その他'
      ])
      expect(valuesAndLabels(startTime)).toEqual(
        Object.entries(START_TIME_LABELS).map(([value, label]) => ({ value, label }))
      )
    })

    test('最初から、23:00 が選択されている', () => {
      const [, , startTime] = buildModalJson().components

      expect(defaultsOf(startTime)).toEqual(['23:00'])
    })
  })

  describe('募集文', () => {
    test('任意入力の段落テキストで、300文字まで', () => {
      const text = buildModalJson().components[3].component

      expect(text.type).toBe(ComponentType.TextInput)
      expect(text.style).toBe(TextInputStyle.Paragraph)
      expect(text.required).toBe(false)
      expect(text.max_length).toBe(300)
    })

    test('見出しに「未入力の場合は例文のままになります」と書かれ、例文が薄く表示される', () => {
      const [, , , text] = buildModalJson().components

      expect(text.label).toBe('募集文（未入力の場合は例文のままになります）')
      expect(text.component.placeholder).toBe('例：おる？')
    })

    test('見出しの文字数が、Discord の上限(45文字)以内', () => {
      const [, , , text] = buildModalJson().components

      expect(text.label.length).toBeLessThanOrEqual(45)
    })
  })

  test('デフォルトの値は、すべて選択肢に存在する', () => {
    expect(Object.keys(MODE_LABELS)).toContain(DEFAULT_SELECTION.mode)
    expect(Object.keys(START_TIME_LABELS)).toContain(DEFAULT_SELECTION.startTime)
    expect(Object.keys(TOGGLE_LABELS)).toContain(DEFAULT_SELECTION.gimmick)
    expect(Object.keys(TOGGLE_LABELS)).toContain(DEFAULT_SELECTION.item)
  })
})

describe('buildJoinRow', () => {
  /**
   * buildJoinRow() の結果を、比較しやすい JSON に変換する。
   *
   * @returns ボタンの JSON の配列
   */
  function buttons (): Array<{ type: number, custom_id: string, label: string, style: number }> {
    return (buildJoinRow().toJSON() as unknown as { components: ReturnType<typeof buttons> }).components
  }

  test('「参加」「取り消し」の2つのボタンが、この順に入っている', () => {
    const row = buttons()

    expect(row).toHaveLength(2)
    expect(row.map((button) => button.type)).toEqual([ComponentType.Button, ComponentType.Button])
    expect(row.map((button) => button.label)).toEqual(['参加', '取り消し'])
    expect(row.map((button) => button.custom_id)).toEqual([CUSTOM_IDS.JOIN_BUTTON, CUSTOM_IDS.LEAVE_BUTTON])
  })

  test('参加は目立つ色(緑)、取り消しは控えめな色(灰色)', () => {
    const [join, leave] = buttons()

    expect(join.style).toBe(ButtonStyle.Success)
    expect(leave.style).toBe(ButtonStyle.Secondary)
  })
})

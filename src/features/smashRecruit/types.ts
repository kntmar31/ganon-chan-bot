import type { MODE_LABELS, TOGGLE_LABELS } from './constants.js'

/** 対戦形式の選択値 */
export type ModeKey = keyof typeof MODE_LABELS

/** 「あり/なし」の選択値 */
export type ToggleKey = keyof typeof TOGGLE_LABELS

/** 募集の入力途中の状態（未選択の項目は undefined） */
export interface RecruitDraft {
  mode?: ModeKey
  gimmick?: ToggleKey
  item?: ToggleKey
}

/**
 * 3項目すべてが選択済みかどうかを判定する。
 *
 * @param state - 入力途中の状態
 * @returns すべて選択済みなら true(このとき state は全項目が必須の型として扱える)
 */
export function isComplete (state: RecruitDraft | undefined): state is Required<RecruitDraft> {
  return state?.mode !== undefined && state.gimmick !== undefined && state.item !== undefined
}

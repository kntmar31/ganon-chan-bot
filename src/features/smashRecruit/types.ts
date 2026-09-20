import { MODE_LABELS, TOGGLE_LABELS } from './constants.js'

/** 対戦形式の選択値 */
export type ModeKey = keyof typeof MODE_LABELS

/** 「あり/なし」の選択値 */
export type ToggleKey = keyof typeof TOGGLE_LABELS

/** モーダルで選択された募集内容(3項目とも選択済み) */
export interface RecruitInput {
  mode: ModeKey
  gimmick: ToggleKey
  item: ToggleKey
}

/**
 * 値が対戦形式の選択値かどうかを判定する。
 * モーダルの送信値はクライアントから届くため、想定外の値が来ても弾けるようにしておく。
 *
 * @param value - 判定する値
 * @returns 対戦形式の選択値なら true
 */
export function isModeKey (value: unknown): value is ModeKey {
  return typeof value === 'string' && Object.hasOwn(MODE_LABELS, value)
}

/**
 * 値が「あり/なし」の選択値かどうかを判定する。
 *
 * @param value - 判定する値
 * @returns 「あり/なし」の選択値なら true
 */
export function isToggleKey (value: unknown): value is ToggleKey {
  return typeof value === 'string' && Object.hasOwn(TOGGLE_LABELS, value)
}

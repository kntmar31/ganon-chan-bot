import { MODE_LABELS, START_TIME_LABELS, TOGGLE_LABELS } from './constants.js'

/** 対戦形式の選択値 */
export type ModeKey = keyof typeof MODE_LABELS

/** 「あり/なし」の選択値 */
export type ToggleKey = keyof typeof TOGGLE_LABELS

/** 希望開始時間の選択値 */
export type StartTimeKey = keyof typeof START_TIME_LABELS

/** モーダルで選択された募集内容(4項目とも選択済み) */
export interface RecruitInput {
  mode: ModeKey
  gimmick: ToggleKey
  item: ToggleKey
  startTime: StartTimeKey
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
 * 値が希望開始時間の選択値かどうかを判定する。
 *
 * @param value - 判定する値
 * @returns 希望開始時間の選択値なら true
 */
export function isStartTimeKey (value: unknown): value is StartTimeKey {
  return typeof value === 'string' && Object.hasOwn(START_TIME_LABELS, value)
}

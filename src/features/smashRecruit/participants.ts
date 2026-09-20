import { PARTICIPANTS_FILE_PREFIX } from './constants.js'

/** 参加ボタンを押したときの結果 */
export type ToggleResult = 'joined' | 'left' | 'full'

/**
 * 参加者の一覧から、アイコン画像の添付ファイル名を作る。
 * 参加者の一覧は、Bot が状態を持たなくて済むように、このファイル名に持たせる。
 *
 * @param ids - 参加者のユーザー ID(参加した順)
 * @returns 添付ファイル名(例: participants-123-456.png。参加者がいなければ participants.png)
 */
export function buildParticipantsFileName (ids: readonly string[]): string {
  return [PARTICIPANTS_FILE_PREFIX, ...ids].join('-') + '.png'
}

/**
 * アイコン画像の添付ファイル名から、参加者の一覧を取り出す。
 * 想定した形でないファイル名からは、空の一覧を返す。
 *
 * @param fileName - 添付ファイル名
 * @returns 参加者のユーザー ID(参加した順)
 */
export function parseParticipantIds (fileName: string | null | undefined): string[] {
  if (fileName === null || fileName === undefined) return []

  const match = /^([^.]+)\.png$/.exec(fileName)
  if (match === null) return []

  const [prefix, ...ids] = match[1].split('-')
  if (prefix !== PARTICIPANTS_FILE_PREFIX) return []

  return ids.filter((id) => /^\d+$/.test(id))
}

/**
 * 参加ボタンを押した人を、参加者の一覧に反映する。
 * すでに参加していれば取り消し、参加していなければ末尾に追加する。定員に達していれば追加しない。
 *
 * @param ids - 現在の参加者のユーザー ID(参加した順)
 * @param userId - ボタンを押した人のユーザー ID
 * @param capacity - 定員
 * @returns 反映後の一覧と、結果(joined: 参加 / left: 取り消し / full: 満員で追加できない)
 */
export function toggleParticipant (
  ids: readonly string[],
  userId: string,
  capacity: number
): { ids: string[], result: ToggleResult } {
  if (ids.includes(userId)) {
    return { ids: ids.filter((id) => id !== userId), result: 'left' }
  }
  if (ids.length >= capacity) {
    return { ids: [...ids], result: 'full' }
  }
  return { ids: [...ids, userId], result: 'joined' }
}

import { PARTICIPANTS_FILE_PREFIX } from './constants.js'

/**
 * 参加者の一覧から、アイコン画像の添付ファイル名を作る。
 * 参加者の一覧は、Bot が状態を持たなくて済むように、このファイル名に持たせる。
 *
 * @param ids - 参加者のユーザー ID(参加した順)
 * @returns 添付ファイル名(例: participants-123-456.png)
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
 * 参加者の一覧に、参加者を追加する。すでに参加していれば、何も変えない。
 *
 * @param ids - 現在の参加者のユーザー ID(参加した順)
 * @param userId - 参加する人のユーザー ID
 * @returns 反映後の一覧と、一覧が変わったかどうか
 */
export function addParticipant (
  ids: readonly string[],
  userId: string
): { ids: string[], changed: boolean } {
  if (ids.includes(userId)) return { ids: [...ids], changed: false }
  return { ids: [...ids, userId], changed: true }
}

/**
 * 参加者の一覧から、参加者を外す。参加していなければ、何も変えない。
 *
 * @param ids - 現在の参加者のユーザー ID(参加した順)
 * @param userId - 取り消す人のユーザー ID
 * @returns 反映後の一覧と、一覧が変わったかどうか
 */
export function removeParticipant (
  ids: readonly string[],
  userId: string
): { ids: string[], changed: boolean } {
  if (!ids.includes(userId)) return { ids: [...ids], changed: false }
  return { ids: ids.filter((id) => id !== userId), changed: true }
}

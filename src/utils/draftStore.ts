// 機能ごと・ユーザーごとの一時的な入力状態を保持する汎用ストア。
// (メモリ上のみ。Bot再起動で消える。DBに永続化したくなったらここだけ差し替えればよい)

const store = new Map<string, unknown>()

/**
 * ストア内のキーを組み立てる。機能名で名前空間を分けることで、機能間の衝突を防ぐ。
 *
 * @param featureKey - 機能を識別するキー
 * @param userId - DiscordのユーザーID
 * @returns ストア内で使うキー
 */
function key (featureKey: string, userId: string): string {
  return `${featureKey}:${userId}`
}

/**
 * ユーザーの一時入力状態を取得する。
 *
 * @param featureKey - 機能を識別するキー
 * @param userId - DiscordのユーザーID
 * @returns 保存されている状態。なければ undefined
 */
export function getDraft<T> (featureKey: string, userId: string): T | undefined {
  return store.get(key(featureKey, userId)) as T | undefined
}

/**
 * ユーザーの一時入力状態を保存する。
 *
 * @param featureKey - 機能を識別するキー
 * @param userId - DiscordのユーザーID
 * @param value - 保存する状態
 */
export function setDraft<T> (featureKey: string, userId: string, value: T): void {
  store.set(key(featureKey, userId), value)
}

/**
 * ユーザーの一時入力状態を削除する。
 *
 * @param featureKey - 機能を識別するキー
 * @param userId - DiscordのユーザーID
 */
export function deleteDraft (featureKey: string, userId: string): void {
  store.delete(key(featureKey, userId))
}

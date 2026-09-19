// 機能ごと・ユーザーごとの一時的な入力状態を保持する汎用ストア。
// (メモリ上のみ。Bot再起動で消える。DBに永続化したくなったらここだけ差し替えればよい)

const store = new Map();

function key(featureKey, userId) {
  return `${featureKey}:${userId}`;
}

export function getDraft(featureKey, userId) {
  return store.get(key(featureKey, userId));
}

export function setDraft(featureKey, userId, value) {
  store.set(key(featureKey, userId), value);
}

export function deleteDraft(featureKey, userId) {
  store.delete(key(featureKey, userId));
}

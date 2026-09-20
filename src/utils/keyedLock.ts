// キーごとに処理を1つずつ順番に実行するための仕組み(メモリ上のみ。再起動で消える)。
// 同じメッセージに対する「読み取って書き換える」処理が、同時に走って上書きし合うのを防ぐ。

const tails = new Map<string, Promise<void>>()

/**
 * 同じキーの処理が実行中なら、その完了を待ってから実行する。異なるキーの処理は並行して動く。
 * 先に実行された処理が失敗しても、後続の処理は実行される。
 *
 * @param key - 直列化の単位を表すキー(例: メッセージ ID)
 * @param task - 実行する処理
 * @returns 処理の結果
 */
export async function runExclusive<T> (key: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve()
  const run = previous.then(task)
  const tail = run.then(() => undefined, () => undefined)
  tails.set(key, tail)

  try {
    return await run
  } finally {
    // 後続の処理が待っていなければ、キーを片付けてメモリを解放する
    if (tails.get(key) === tail) tails.delete(key)
  }
}

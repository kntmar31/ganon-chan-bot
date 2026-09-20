import { runExclusive } from '../../src/utils/keyedLock.js'

/**
 * 指定したミリ秒だけ待つ。
 *
 * @param ms - 待つ時間(ミリ秒)
 * @returns 待ち終えたら解決する Promise
 */
async function sleep (ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

describe('runExclusive', () => {
  test('処理の結果を返す', async () => {
    await expect(runExclusive('key', async () => 42)).resolves.toBe(42)
  })

  test('同じキーの処理は、呼んだ順に1つずつ実行される', async () => {
    const events: string[] = []

    const first = runExclusive('same', async () => {
      events.push('first:start')
      await sleep(20)
      events.push('first:end')
    })
    const second = runExclusive('same', async () => {
      events.push('second:start')
      events.push('second:end')
    })
    await Promise.all([first, second])

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
  })

  test('異なるキーの処理は、待たずに並行して実行される', async () => {
    const events: string[] = []

    const slow = runExclusive('a', async () => {
      events.push('a:start')
      await sleep(20)
      events.push('a:end')
    })
    const fast = runExclusive('b', async () => {
      events.push('b:start')
      events.push('b:end')
    })
    await Promise.all([slow, fast])

    expect(events).toEqual(['a:start', 'b:start', 'b:end', 'a:end'])
  })

  test('先の処理が失敗しても、その例外は呼び出し元に伝わり、後続の処理は実行される', async () => {
    const failing = runExclusive('fail', async () => {
      throw new Error('失敗')
    })
    const following = runExclusive('fail', async () => 'ok')

    await expect(failing).rejects.toThrow('失敗')
    await expect(following).resolves.toBe('ok')
  })

  test('全部終わったあとに、同じキーでもう一度実行できる', async () => {
    await runExclusive('again', async () => 1)

    await expect(runExclusive('again', async () => 2)).resolves.toBe(2)
  })
})

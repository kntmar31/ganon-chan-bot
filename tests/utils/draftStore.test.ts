import { deleteDraft, getDraft, setDraft } from '../../src/utils/draftStore.js'

describe('draftStore', () => {
  // ストアはモジュール内で共有されるため、テストごとに使ったキーを片付ける
  afterEach(() => {
    deleteDraft('feature-a', 'user-1')
    deleteDraft('feature-a', 'user-2')
    deleteDraft('feature-b', 'user-1')
  })

  test('保存していない状態は undefined を返す', () => {
    expect(getDraft('feature-a', 'user-1')).toBeUndefined()
  })

  test('保存した状態を取得できる', () => {
    setDraft('feature-a', 'user-1', { mode: 'team' })

    expect(getDraft('feature-a', 'user-1')).toEqual({ mode: 'team' })
  })

  test('同じキーに保存し直すと上書きされる', () => {
    setDraft('feature-a', 'user-1', { mode: 'team' })
    setDraft('feature-a', 'user-1', { mode: 'both' })

    expect(getDraft('feature-a', 'user-1')).toEqual({ mode: 'both' })
  })

  test('ユーザーごとに状態が分かれる', () => {
    setDraft('feature-a', 'user-1', 'one')
    setDraft('feature-a', 'user-2', 'two')

    expect(getDraft('feature-a', 'user-1')).toBe('one')
    expect(getDraft('feature-a', 'user-2')).toBe('two')
  })

  test('機能ごとに名前空間が分かれ、同じユーザーでも混ざらない', () => {
    setDraft('feature-a', 'user-1', 'from-a')
    setDraft('feature-b', 'user-1', 'from-b')

    expect(getDraft('feature-a', 'user-1')).toBe('from-a')
    expect(getDraft('feature-b', 'user-1')).toBe('from-b')
  })

  test('削除した状態は取得できなくなり、他の状態には影響しない', () => {
    setDraft('feature-a', 'user-1', 'one')
    setDraft('feature-a', 'user-2', 'two')

    deleteDraft('feature-a', 'user-1')

    expect(getDraft('feature-a', 'user-1')).toBeUndefined()
    expect(getDraft('feature-a', 'user-2')).toBe('two')
  })
})

import { defineComponent, defineEvent } from '../src/types.js'

describe('defineComponent', () => {
  test('渡したハンドラを、そのまま返す(customId と処理が変わらない)', async () => {
    const execute = jest.fn().mockResolvedValue(undefined)
    const component = defineComponent({ customId: 'feature:action', execute })

    expect(component.customId).toBe('feature:action')
    await component.execute({} as any)
    expect(execute).toHaveBeenCalledTimes(1)
  })
})

describe('defineEvent', () => {
  test('受け取るイベントの名前を、そのまま持つ', () => {
    const handler = defineEvent('messageReactionAdd', async () => {})

    expect(handler.event).toBe('messageReactionAdd')
  })

  test('イベントの引数を、そのまま処理に渡す', async () => {
    const execute = jest.fn().mockResolvedValue(undefined)
    const handler = defineEvent('messageReactionAdd', execute)
    const reaction = { emoji: 'a' }
    const user = { id: '1' }

    await handler.execute(reaction, user)

    expect(execute).toHaveBeenCalledWith(reaction, user)
  })

  test('処理が例外を投げたら、そのまま呼び出し元に伝える', async () => {
    const handler = defineEvent('messageReactionAdd', async () => { throw new Error('失敗') })

    await expect(handler.execute({}, {})).rejects.toThrow('失敗')
  })
})

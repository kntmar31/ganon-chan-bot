import command from '../../../src/features/smashRecruit/command.js'
import { CUSTOM_IDS } from '../../../src/features/smashRecruit/constants.js'

describe('/smash-recruit コマンド', () => {
  test('コマンド名が smash-recruit', () => {
    expect(command.data.name).toBe('smash-recruit')
  })

  test('実行すると、募集内容の入力モーダルを表示する', async () => {
    const showModal = jest.fn().mockResolvedValue(undefined)
    const reply = jest.fn()

    await command.execute({ showModal, reply } as any)

    expect(showModal).toHaveBeenCalledTimes(1)
    expect(showModal.mock.calls[0][0].toJSON().custom_id).toBe(CUSTOM_IDS.MODAL)
    expect(reply).not.toHaveBeenCalled()
  })
})

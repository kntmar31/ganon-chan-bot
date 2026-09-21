import { resolveDeployTarget } from '../../src/utils/deployTarget.js'

const CLIENT_ID = '123456789012345678'
const GUILD_ID = '987654321098765432'

describe('resolveDeployTarget', () => {
  describe('GUILD_ID が指定されているとき(サーバー限定)', () => {
    test('そのサーバーだけに登録する', () => {
      const target = resolveDeployTarget(CLIENT_ID, GUILD_ID)

      expect(target.route).toBe(`/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`)
    })

    test('ログ用の説明に、登録先のサーバー ID が入る', () => {
      expect(resolveDeployTarget(CLIENT_ID, GUILD_ID).description).toBe(`サーバー限定(GUILD_ID=${GUILD_ID})`)
    })

    test('前後の空白は、取り除いて扱う', () => {
      const target = resolveDeployTarget(CLIENT_ID, `  ${GUILD_ID}  `)

      expect(target.route).toBe(`/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`)
    })
  })

  describe('GUILD_ID が空のとき(全サーバー共通)', () => {
    test.each([
      ['未指定(undefined)', undefined],
      ['空文字', ''],
      ['空白だけ', '   ']
    ])('%sなら、全サーバー共通で登録する', (_name, guildId) => {
      const target = resolveDeployTarget(CLIENT_ID, guildId)

      expect(target.route).toBe(`/applications/${CLIENT_ID}/commands`)
    })

    test('ログ用の説明で、全サーバー共通であることが分かる', () => {
      expect(resolveDeployTarget(CLIENT_ID, '').description).toBe('全サーバー共通(GUILD_ID が空のため)')
    })

    test('全サーバー共通の登録先には、サーバーの ID が含まれない', () => {
      expect(resolveDeployTarget(CLIENT_ID, '').route).not.toContain('guilds')
    })
  })

  test('Bot(アプリ)ごとに、登録先が変わる(開発用と本番用のアプリが、混ざらない)', () => {
    const dev = resolveDeployTarget('111', GUILD_ID)
    const prod = resolveDeployTarget('222', '')

    expect(dev.route).toContain('/applications/111/')
    expect(prod.route).toContain('/applications/222/')
  })
})

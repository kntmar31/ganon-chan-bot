import type { Feature } from '../../types.js'
import command from './command.js'
import components from './components.js'

// features/index.ts のローダーがこの形式（{ commands, components }）を期待する。
// 新しい機能を作るときも、同じ形でexport defaultすればよい。
const feature: Feature = {
  commands: [command],
  components
}

export default feature

import command from './command.js';
import components from './components.js';

// features/index.js のローダーがこの形式（{ commands, components }）を期待する。
// 新しい機能を作るときも、同じ形でexport defaultすればよい。
export default {
  commands: [command],
  components,
};

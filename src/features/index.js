// src/features/ 配下の各フォルダを機能単位として自動的に読み込む。
// 新しい機能を追加するときは、ここを書き換える必要はなく、
// フォルダを1つ増やして index.js を export default { commands, components } の形で書けばよい。

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const featuresDir = path.dirname(fileURLToPath(import.meta.url));

export async function loadFeatures() {
  const commands = [];
  const components = [];

  const entries = readdirSync(featuresDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  for (const entry of entries) {
    const indexPath = path.join(featuresDir, entry.name, 'index.js');
    const { default: feature } = await import(pathToFileURL(indexPath).href);

    if (!feature) {
      console.warn(`[警告] features/${entry.name} に default export がありません`);
      continue;
    }

    if (feature.commands) commands.push(...feature.commands);
    if (feature.components) components.push(...feature.components);
  }

  return { commands, components };
}

# CLAUDE.md

複数機能を想定した Discord Bot「ガノンちゃん」(discord.js v14)。構成や機能追加の手順は README.md を参照。

## コーディング規約
- TypeScript を使用すること(ESM。`tsconfig.json` は NodeNext)
- 関数にはすべて JSDoc コメントを付けること(コメントは日本語)
- JavaScript/TypeScript のコードスタイルは JavaScript Standard Style(ts-standard)に従うこと
  - セミコロンなし、シングルクォート、インデントは2スペース
  - `npm run lint` でチェック、`npm run lint:fix` で自動整形
- 相対 import には拡張子 `.js` を付けること(例: `import { x } from './foo.js'`)。実体が `.ts` でも同じ
- テストは Jest(`npm test`)。`tests/` 配下に、`src/` の構成に対応させて `*.test.ts` を置く
  - ts-standard はテストファイルを対象外にしている

## Bot の実装ルール
- 機能は `src/features/<機能名>/` に1機能1フォルダで追加する。`src/index.ts` や `src/deploy-commands.ts` は書き換えない
- customId は `機能名:アクション名` で統一する(例: `smash-recruit:submit`)
- セレクトメニュー・ボタン・モーダルのハンドラは `defineComponent()`(`src/types.ts`)で包む
- 本人だけに見えるメッセージは `flags: MessageFlags.Ephemeral` で指定する(`ephemeral: true` は非推奨)
- Bot 名は `src/config.ts` の `BOT_NAME` に集約する。コード内に直接書かない
- ユーザーごとの一時入力状態は `src/utils/draftStore.ts` を使う(メモリ上のみ。再起動で消える)

## 実行とビルド
- 実行するのは `tsc` でビルドした `dist/`
- 起動: `npm start`(ビルドして起動)。コマンドの定義を変えたときは `npm run dev`(ビルド → コマンド登録 → 起動)
- `npm run start:prod` はビルドせず `dist/` をそのまま起動する。`npm run deploy-commands` も `dist/` を使うため、事前にビルドが必要
- `src/features/index.ts`(機能ローダー)は `import.meta` を使うため、Jest では扱えずテスト対象外

## 注意点
- `.env` には Bot のトークンが入っている。内容を読み取らない・出力しない・コミットしない(`.gitignore` で除外済み)
- Discord 上での動作確認にはトークンが必要なため、実機確認はユーザーに依頼する。確認していない場合は、その旨を PR に明記する
- 変更時は必ず Pull Request を作ること
- Pull Request では必ず Label を設定すること
- ファイルを削除する場合は、削除予定のファイル一覧を提示してユーザーの確認を得てから実行すること

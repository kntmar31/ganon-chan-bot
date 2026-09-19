# ガノンちゃん（ganon-chan-bot）

複数機能への拡張を前提にした構成のDiscord Bot。
現時点の機能は「スマブラの対戦相手を募集する」の1つ（`smash-recruit`）だが、
今後の機能追加は `src/features/` にフォルダを1つ足すだけで済むようにしてある。

「ガノンちゃん」は仮の名前で、後で変える可能性がある。
コード内でBot名を参照している箇所は `src/config.ts` の `BOT_NAME` 1箇所にまとめてあるので、
名前を変えたくなったらそこだけ書き換えればよい。

> **注意**：Discord上でBotのアイコン横に表示される実際のユーザー名（アカウント名）は、
> このコードではなく [Discord Developer Portal](https://discord.com/developers/applications) の
> 「Bot」設定画面で変更する必要がある。`BOT_NAME` はログ出力やステータス表示など、コード内で使う名前。

## ディレクトリ構成

```
ganon-chan-bot/
├── package.json
├── tsconfig.json
├── .env.example
├── dist/                    # tsc のビルド成果物（git管理外）。実行時はこちらを読み込む
└── src/
    ├── index.ts             # エントリーポイント。interactionをcustomId/コマンド名で振り分けるだけ
    ├── deploy-commands.ts   # 全機能のスラッシュコマンドを自動収集して登録
    ├── config.ts            # BOT_NAMEなど、Bot全体に関わる設定値
    ├── types.ts             # Command / Component / Feature など、機能共通の型
    ├── utils/
    │   └── draftStore.ts    # 機能横断で使う、ユーザーごとの一時入力状態ストア
    └── features/
        ├── index.ts         # features配下のフォルダを自動スキャンして読み込むローダー
        └── smashRecruit/    # 「募集機能」一式（1機能1フォルダ）
            ├── index.ts         # この機能のcommands/componentsをまとめて返す窓口
            ├── constants.ts     # customIdや選択肢ラベルなどの定数
            ├── types.ts         # 入力途中の状態(RecruitDraft)などの型
            ├── command.ts       # /smash-recruit の定義と初期応答
            ├── components.ts    # セレクトメニュー・ボタン・モーダルの処理
            └── view.ts          # メッセージ本文・コンポーネントの組み立てロジック
```

### 設計方針

- **機能ごとにフォルダを分ける**：セレクトメニューやボタンは、その機能のスラッシュコマンドと常にセットで使うため、
  種類別（commands/buttons/...）ではなく機能別にまとめている。1つの機能を触るときに1フォルダ内で完結する。
- **`src/features/index.ts` はフォルダを自動スキャンするだけ**：新機能を追加してもこのファイルを編集する必要はない。
- **customIdは `機能名:アクション名` で統一**（例: `smash-recruit:submit`）：機能が増えてもcustomIdが衝突しない。
- **一時状態は `draftStore.ts` に集約**：`getDraft(featureKey, userId)` のように機能名でネームスペースを分けるので、
  複数機能が同時に「選択中の入力」を持っても混ざらない。

## 新しい機能を追加する手順

1. `src/features/<新機能名>/` フォルダを作る
2. その中に、既存の `smashRecruit/` を参考に `constants.ts` / `command.ts` / `components.ts` / `view.ts` を作る
   （小さい機能ならファイルを分けず1〜2ファイルにまとめても構わない）
3. `index.ts` で `export default { commands: [...], components: [...] }`（型は `Feature`）を返す
   - セレクトメニュー・ボタン・モーダルのハンドラは `defineComponent()`（`src/types.ts`）で包む
4. `npm run build` → `npm run deploy-commands` を実行すればコマンドが自動的に登録される

`src/index.ts` や `src/deploy-commands.ts` を書き換える必要はない。

## 1. Botアカウントの準備

1. [Discord Developer Portal](https://discord.com/developers/applications) で「New Application」からアプリを作成
2. 左メニュー「Bot」→「Add Bot」でBotを作成し、「Reset Token」でトークンを取得
3. 左メニュー「OAuth2」→「URL Generator」で
   - SCOPES: `bot`, `applications.commands`
   - BOT PERMISSIONS: `Send Messages`, `Mention Everyone`, `Use Slash Commands`
   を選び、生成されたURLからBotをサーバーに招待

## 2. セットアップ

```bash
npm install
cp .env.example .env
```

`.env` を編集し、以下を設定：

- `DISCORD_TOKEN`：Botのトークン
- `CLIENT_ID`：Developer Portalの「General Information」にあるApplication ID
- `GUILD_ID`：動作確認したいサーバーのID（サーバーを右クリック→「IDをコピー」／開発者モードが必要）
- `RECRUIT_CHANNEL_ID`（任意）：募集メッセージを固定チャンネルに投稿したい場合のみ設定。空欄ならコマンドを打ったチャンネルに投稿されます

## 3. コマンド登録＆起動

```bash
npm run build
npm run deploy-commands
npm start
```

TypeScript をビルドした `dist/` を実行するので、コードを変更したら `npm run build` からやり直す。

起動すると `ガノンちゃん が起動しました（アカウント: ...）` とログが出て、Discord上のBotのステータスに
「視聴中：ガノンちゃん稼働中」と表示される（`src/index.ts` 内で `BOT_NAME` を使って設定している）。

Discord上で `/smash-recruit` を実行すると募集フローが始まります。

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run build` | TypeScript をビルドして `dist/` に出力 |
| `npm run lint` | ts-standard（JavaScript Standard Style）でチェック |
| `npm run lint:fix` | ts-standard で自動整形 |

## 注意点

- `@everyone` を実際に通知するには、Bot自身に「Mention Everyone」権限が必要です（上記の招待URLに含めています）
- 選択中のデータはメモリ上にのみ保持しています。Botを再起動すると選択途中の状態は失われます（投稿済みのメッセージには影響ありません）
- 機能が増えて複数人が同時にBotを使うようになった場合、`draftStore.ts` のMapはプロセスをまたがないため、
  Botを複数プロセスで動かす構成にするときはRedis等の外部ストアに差し替える必要があります

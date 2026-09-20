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
    │   ├── draftStore.ts    # 機能横断で使う、ユーザーごとの一時入力状態ストア
    │   └── keyedLock.ts     # 同じキー(例: メッセージ)への処理を、1つずつ順番に実行する仕組み
    └── features/
        ├── index.ts         # features配下のフォルダを自動スキャンして読み込むローダー
        └── smashRecruit/    # 「募集機能」一式（1機能1フォルダ）
            ├── index.ts         # この機能のcommands/componentsをまとめて返す窓口
            ├── constants.ts     # customIdや選択肢ラベルなどの定数
            ├── types.ts         # 募集内容(RecruitInput)などの型と、選択値の判定
            ├── command.ts       # /smash-recruit の定義と、モーダルの表示
            ├── components.ts    # モーダル送信時の処理(募集メッセージの投稿)と、参加ボタンの処理
            ├── participants.ts  # 参加者の一覧の扱い(添付ファイル名との相互変換、参加・取り消しの判定)
            ├── participantsImage.ts  # 参加者のアイコンを横一列に並べた画像の合成と、アイコンのダウンロード
            └── view.ts          # 募集内容を入力するモーダルと、参加ボタンの組み立てロジック
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
   - BOT PERMISSIONS: `Send Messages`, `Mention Everyone`, `Use Slash Commands`, `Attach Files`
   を選び、生成されたURLからBotをサーバーに招待

`Attach Files` は、募集メッセージに参加者のアイコン画像を添付するために必要。すでに招待済みのサーバーでは、
サーバー設定（またはチャンネル設定）でBotのロールに「ファイルを添付」権限を追加する。

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

初回や、スラッシュコマンドの定義を変えたときは、ビルド → コマンド登録 → 起動をまとめて実行する。

```bash
npm run dev
```

コマンドの定義を変えていないときは、コマンド登録は不要なので、ビルドして起動するだけでよい。

```bash
npm start
```

どちらも、途中のコマンドが失敗した場合はそこで止まり、Bot は起動しない。
`npm start` は起動のたびにビルドするため、常に最新のコードが動く（`dist/` が古いまま動くことがない）。

Bot は TypeScript をビルドした `dist/` を実行する。ビルドしない環境（`typescript` を入れない本番環境など）では、
ビルド済みの `dist/` を `npm run start:prod` でそのまま起動する。

起動すると `ガノンちゃん が起動しました（アカウント: ...）` とログが出て、Discord上のBotのステータスに
「視聴中：ガノンちゃん稼働中」と表示される（`src/index.ts` 内で `BOT_NAME` を使って設定している）。

Discord上で `/smash-recruit` を実行すると、募集内容を入力するポップアップ（モーダル）が開きます。
対戦形式・ステージギミック・アイテムをラジオボタンで選び（3項目とも必須）、募集文は任意で入力して送信すると、募集メッセージが投稿されます。
投稿される募集メッセージの1行目は、募集文を入力した場合は `@everyone 募集文 (by 投稿者)`、未入力の場合は `@everyone おる？ (by 投稿者)` になります（未入力時の文言は `constants.ts` の `DEFAULT_RECRUIT_TEXT`）。2行目以降に、選んだ対戦形式・ステージギミック・アイテムが並びます。
最初から「個人戦・ギミックなし・アイテムなし」が選択されています（デフォルト値は `constants.ts` の `DEFAULT_SELECTION`）。

投稿された募集メッセージには、「参加 / 取消」ボタンと、参加者のアイコンを名前なしで横一列に並べた画像が付きます。

- ボタンを押すと参加、参加済みの人がもう一度押すと取り消しになります（最大 `MAX_PARTICIPANTS` 人。`constants.ts` で変更できます）
- 定員に達していると、押した人にだけ「満員です」と表示されます（参加済みの人は取り消せます）
- 参加者の枠は、空いている分が灰色の丸で表示されます
- アイコンは、Discord 全体のアイコンを使います（サーバーごとのアイコンは使いません）
- 画像は、押されるたびに作り直して差し替えます。画像の合成には [sharp](https://sharp.pixelplumbing.com/) を使っています

モーダル内のラジオグループは新しい Discord API の機能のため、`discord.js` は 14.27.0 以上が必要です。

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm start` | ビルドして起動 |
| `npm run dev` | ビルド → コマンド登録 → 起動を、まとめて実行 |
| `npm run start:prod` | ビルドせず、`dist/` をそのまま起動（ビルド済みの環境向け） |
| `npm run deploy-commands` | スラッシュコマンドを Discord に登録（ビルド済みの `dist/` が必要） |
| `npm run build` | TypeScript をビルドして `dist/` に出力 |
| `npm run lint` | ts-standard（JavaScript Standard Style）でチェック |
| `npm run lint:fix` | ts-standard で自動整形 |
| `npm test` | Jest でユニットテストを実行（`tests/` 配下。ソースの構成に対応させている） |

テストは ts-jest で CommonJS として実行する。`import.meta` を使う `src/features/index.ts`（機能ローダー）は
この環境では扱えないため、テスト対象外にしている。

## 注意点

- `@everyone` を実際に通知するには、Bot自身に「Mention Everyone」権限が必要です（上記の招待URLに含めています）
- 募集機能はモーダル1画面で入力が完結するため、入力途中の状態をBot側では保持しません（`draftStore.ts` は、複数の画面をまたぐ機能を作るときのために残しています）
- 参加者の一覧は、Bot のメモリではなく、投稿に添付した画像のファイル名（`participants-<ユーザーID>-….png`）に持たせています。そのため、Bot を再起動しても、投稿済みの募集の参加者は消えません
- 同じ投稿への同時の操作は、`keyedLock.ts` で1つずつ順番に処理します。この仕組みはプロセス内だけで働くため、Botを複数プロセスで動かす構成にするときは、別の排他制御が必要です
- 機能が増えて複数人が同時にBotを使うようになった場合、`draftStore.ts` のMapはプロセスをまたがないため、
  Botを複数プロセスで動かす構成にするときはRedis等の外部ストアに差し替える必要があります

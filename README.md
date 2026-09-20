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
            ├── components.ts    # モーダル送信時の処理(募集メッセージの投稿)と、参加・取り消しボタンの処理
            ├── participants.ts  # 参加者の一覧の扱い(添付ファイル名との相互変換、参加・取り消しの判定)
            ├── participantsImage.ts  # 参加者のアイコンを横一列に並べた画像の合成と、アイコンのダウンロード
            └── view.ts          # 募集内容を入力するモーダルと、参加・取り消しボタンの組み立てロジック
```

### 設計方針

- **機能ごとにフォルダを分ける**：セレクトメニューやボタンは、その機能のスラッシュコマンドと常にセットで使うため、
  種類別（commands/buttons/...）ではなく機能別にまとめている。1つの機能を触るときに1フォルダ内で完結する。
- **`src/features/index.ts` はフォルダを自動スキャンするだけ**：新機能を追加してもこのファイルを編集する必要はない。
- **customIdは `機能名:アクション名` で統一**（例: `smash-recruit:join`）：機能が増えてもcustomIdが衝突しない。
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
   - BOT PERMISSIONS: `View Channels`, `Send Messages`, `Attach Files`, `Mention Everyone`
   を選び、生成されたURLからBotをサーバーに招待

権限の値は `166912` で、招待URLは次の形になる（`<CLIENT_ID>` は Application ID）。

```
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot+applications.commands&permissions=166912
```

| 権限 | 使う場面 |
| --- | --- |
| `View Channels` | 投稿先のチャンネルを見る |
| `Send Messages` | 募集メッセージを投稿する |
| `Attach Files` | 参加者のアイコン画像を添付する |
| `Mention Everyone` | `@everyone` で通知する |

すでに招待済みのサーバーでは、サーバー設定（またはチャンネル設定）でBotのロールに不足している権限を追加する。
チャンネルごとの権限設定で上書きされていると、そちらが優先される（特に `Mention Everyone` は上書きされやすい）。
`Use Slash Commands` は、コマンドを実行する人側の権限で、Bot 側には不要。

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

| 項目 | 形式 | 最初の状態 |
| --- | --- | --- |
| 対戦形式 | ラジオボタン（必須）：個人戦 / チーム戦 / 個人戦 / チーム戦 どちらも | 個人戦 |
| ステージギミック・アイテム | チェックボックス（任意）：「ステージギミックあり」「アイテムあり」。チェックしたものが「あり」、チェックなしは「なし」 | どちらもチェックなし（なし・なし） |
| 希望開始時間 | セレクトメニュー（必須）：23:00 / 23:30 / 0:00 / 0:30 / 1:00 / その他 | 23:00 |
| 募集文 | テキスト入力（任意・300文字まで） | 未入力（例文「おる？」が薄く表示される） |

最初の状態（デフォルト値）は `constants.ts` の `DEFAULT_SELECTION` で決めています。
モーダルの部品は、Discord の上限（5個）まで、あと1個の空きがあります。

送信すると、募集メッセージが投稿されます。

```
@everyone 初心者歓迎！
・対戦形式：個人戦
・ステージギミック：なし
・アイテム：なし
・希望開始時間：23:00
・募集した人：@ユーザー
・参加者
[参加者のアイコン画像]
[参加] [取り消し]
```

- 1行目は `@everyone 募集文`。募集文が未入力の場合は `@everyone おる？` になります（`constants.ts` の `DEFAULT_RECRUIT_TEXT`）
- 通知されるのは `@everyone` だけです（「募集した人」のメンションでは通知されません）

### 参加・取り消し

- 投稿者は、最初から参加者になります
- 「参加」を押すと参加、「取り消し」を押すと取り消しになります。参加済みの人が「参加」を、参加していない人が「取り消し」を押したときは、押した人にだけ案内が表示され、投稿は変わりません
  （メッセージは全員に同じ表示になり、見る人ごとにボタンを切り替えられないため、ボタンは2つに分けています）
- 参加人数に上限はありません
- 参加者のアイコンは、名前なしで横一列に並べた1枚の画像として、投稿の「・参加者」の下に表示されます。1列に8人ずつで、9人目から次の段に折り返します
- 参加者が誰もいなくなると、画像は投稿から外れます（次に誰かが参加すると、付き直します）
- アイコンは、Discord 全体のアイコンを使います（サーバーごとのアイコンは使いません）。取得できなかった人は、灰色の丸で表示します
- 画像は、押されるたびに作り直して差し替えます。画像の合成には [sharp](https://sharp.pixelplumbing.com/) を使っています

画像は、解像度の高いスマホの画面でもボヤけないよう、2倍の大きさ（アイコン 192px、画像の幅 1704px）で作っています。
Discord は、画像を PC では最大 550px 幅、スマホでは画面の幅に合わせて縮小して表示します。
画面上のアイコンの大きさは、アイコンと画像の幅の比率で決まり、PC で約 62px、スマホで約 37px になります
（`constants.ts` の `AVATAR_SIZE` / `AVATAR_GAP` / `AVATARS_PER_ROW` で調整できます）。

モーダル内のラジオグループ・チェックボックスグループは新しい Discord API の機能のため、`discord.js` は 14.27.0 以上が必要です。

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
  ファイル名は、参加者1人につき約20文字ずつ長くなります。Discord のファイル名の長さの上限は確認できていないため、数十人規模の募集では、更新に失敗する可能性があります
- 参加・取り消しのたびに、参加者全員のアイコンをダウンロードし直して画像を作り直します。人数が多いと、更新に時間がかかります
- 同じ投稿への同時の操作は、`keyedLock.ts` で1つずつ順番に処理します。この仕組みはプロセス内だけで働くため、Botを複数プロセスで動かす構成にするときは、別の排他制御が必要です
- 機能が増えて複数人が同時にBotを使うようになった場合、`draftStore.ts` のMapはプロセスをまたがないため、
  Botを複数プロセスで動かす構成にするときはRedis等の外部ストアに差し替える必要があります

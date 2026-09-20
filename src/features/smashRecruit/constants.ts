// この機能を一意に識別するキー（customIdの接頭辞に使う）
export const FEATURE_KEY = 'smash-recruit'

// customIdは "機能名:アクション名" で統一し、他の機能と衝突しないようにする
export const CUSTOM_IDS = {
  JOIN_BUTTON: `${FEATURE_KEY}:join`,
  LEAVE_BUTTON: `${FEATURE_KEY}:leave`,
  MODAL: `${FEATURE_KEY}:modal`,
  MODAL_MODE: `${FEATURE_KEY}:modal-mode`,
  MODAL_GIMMICK: `${FEATURE_KEY}:modal-gimmick`,
  MODAL_ITEM: `${FEATURE_KEY}:modal-item`,
  MODAL_START_TIME: `${FEATURE_KEY}:modal-start-time`,
  MODAL_TEXT_INPUT: `${FEATURE_KEY}:modal-text`
} as const

// 対戦形式の選択肢（キー: 内部で使う値、値: 画面に表示するラベル）
export const MODE_LABELS = {
  individual: '個人戦',
  team: 'チーム戦',
  both: '両方OK'
} as const

// ステージギミック・アイテムの「あり/なし」の選択肢(定義の順が、画面に表示される順になる)
export const TOGGLE_LABELS = {
  off: 'なし',
  on: 'あり'
} as const

// 参加者のアイコン画像の設定(単位: px。Discord 上では、幅に合わせて縮小して表示される)
// 参加人数に上限はなく、アイコンは1列に AVATARS_PER_ROW 人ずつ並べ、あふれたら次の列に折り返す
export const AVATAR_SIZE = 96
export const AVATAR_GAP = 12
export const AVATARS_PER_ROW = 8

// 参加者のアイコン画像のすぐ上に表示する、見出しの文言
export const PARTICIPANTS_HEADING = '・参加者'

// 参加者のアイコン画像の添付ファイル名の接頭辞。参加者の一覧をファイル名に持たせている
export const PARTICIPANTS_FILE_PREFIX = 'participants'

// 募集文が未入力のときに、募集メッセージの1行目に入れる文言
export const DEFAULT_RECRUIT_TEXT = 'おる？'

// 希望開始時間の選択肢(定義の順が、画面に表示される順になる。キー: 内部で使う値、値: 画面に表示するラベル)
export const START_TIME_LABELS = {
  '23:00': '23:00',
  '23:30': '23:30',
  '0:00': '0:00',
  '0:30': '0:30',
  '1:00': '1:00',
  other: 'その他'
} as const

// モーダルを開いたときに、最初から選択されている値
export const DEFAULT_SELECTION = {
  mode: 'individual',
  gimmick: 'off',
  item: 'off',
  startTime: '23:00'
} as const satisfies {
  mode: keyof typeof MODE_LABELS
  gimmick: keyof typeof TOGGLE_LABELS
  item: keyof typeof TOGGLE_LABELS
  startTime: keyof typeof START_TIME_LABELS
}

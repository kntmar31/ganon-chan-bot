// この機能を一意に識別するキー（customIdの接頭辞に使う）
export const FEATURE_KEY = 'smash-recruit'

// customIdは "機能名:アクション名" で統一し、他の機能と衝突しないようにする
export const CUSTOM_IDS = {
  JOIN_BUTTON: `${FEATURE_KEY}:join`,
  LEAVE_BUTTON: `${FEATURE_KEY}:leave`,
  MODAL: `${FEATURE_KEY}:modal`,
  MODAL_MODE: `${FEATURE_KEY}:modal-mode`,
  MODAL_OPTIONS: `${FEATURE_KEY}:modal-options`,
  MODAL_START_TIME: `${FEATURE_KEY}:modal-start-time`,
  MODAL_TEXT_INPUT: `${FEATURE_KEY}:modal-text`
} as const

// 対戦形式の選択肢（キー: 内部で使う値、値: 画面に表示するラベル）
export const MODE_LABELS = {
  individual: '個人戦',
  team: 'チーム戦',
  both: '個人戦 / チーム戦 どちらも'
} as const

// ステージギミック・アイテムの「あり/なし」の選択肢(定義の順が、画面に表示される順になる)
export const TOGGLE_LABELS = {
  off: 'なし',
  on: 'あり'
} as const

// 参加者のアイコン画像の設定(単位: px)
// 参加人数に上限はなく、アイコンは1列に AVATARS_PER_ROW 人ずつ並べ、あふれたら次の列に折り返す。
// Discord の PC は、画像を最大 550px 幅で表示し、それより広い画像は縮小する(実機で 64px のアイコンが 62px で表示されたことから逆算)。
// 1列ぶんの画像の幅(8 * AVATAR_SIZE + 7 * AVATAR_GAP = 355px)を 550px 以下にして、PC で縮小されず、この大きさのまま表示されるようにしている。
// スマホは画面の幅に合わせて縮小されるが、アイコンと間隔の比率(8:1)を保っているため、見た目の大きさは以前とほぼ変わらない
export const AVATAR_SIZE = 40
export const AVATAR_GAP = 5
export const AVATARS_PER_ROW = 8

// 参加者のアイコン画像のすぐ上に表示する、見出しの文言
export const PARTICIPANTS_HEADING = '・参加者'

// 参加者のアイコン画像の添付ファイル名の接頭辞。参加者の一覧をファイル名に持たせている
export const PARTICIPANTS_FILE_PREFIX = 'participants'

// 募集文が未入力のときに、募集メッセージの1行目に入れる文言
export const DEFAULT_RECRUIT_TEXT = 'おる？'

// ステージギミックとアイテムを、「あり」にするかどうかで選ぶチェックボックス(チェックあり: あり、チェックなし: なし)
// キーは、募集内容(RecruitInput)の項目名。value は、送信値として届く値
export const OPTION_CHECKBOXES = {
  gimmick: { value: 'gimmick', label: 'ステージギミックあり' },
  item: { value: 'item', label: 'アイテムあり' }
} as const

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

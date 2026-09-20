// この機能を一意に識別するキー（customIdの接頭辞に使う）
export const FEATURE_KEY = 'smash-recruit'

// customIdは "機能名:アクション名" で統一し、他の機能と衝突しないようにする
export const CUSTOM_IDS = {
  MODAL: `${FEATURE_KEY}:modal`,
  MODAL_MODE: `${FEATURE_KEY}:modal-mode`,
  MODAL_GIMMICK: `${FEATURE_KEY}:modal-gimmick`,
  MODAL_ITEM: `${FEATURE_KEY}:modal-item`,
  MODAL_TEXT_INPUT: `${FEATURE_KEY}:modal-text`
} as const

// 対戦形式の選択肢（キー: 内部で使う値、値: 画面に表示するラベル）
export const MODE_LABELS = {
  individual: '個人戦',
  team: 'チーム戦',
  both: '両方OK'
} as const

// ステージギミック・アイテムの「あり/なし」の選択肢
export const TOGGLE_LABELS = {
  on: 'あり',
  off: 'なし'
} as const

import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { CUSTOM_IDS, MODE_LABELS, TOGGLE_LABELS } from './constants.js';

export function buildStatusLine(state) {
  const mode = state.mode ? MODE_LABELS[state.mode] : '未選択';
  const gimmick = state.gimmick ? TOGGLE_LABELS[state.gimmick] : '未選択';
  const item = state.item ? TOGGLE_LABELS[state.item] : '未選択';

  return [
    '**スマブラ募集の条件を選んでください**',
    `・対戦形式：${mode}`,
    `・ステージギミック：${gimmick}`,
    `・アイテム：${item}`,
    '',
    '3項目すべて選択すると「募集文を入力して投稿」が押せるようになります。',
  ].join('\n');
}

export function buildComponents(state) {
  const modeSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_MODE)
    .setPlaceholder('対戦形式を選択')
    .addOptions(
      Object.entries(MODE_LABELS).map(([value, label]) => ({
        value,
        label,
        default: state.mode === value,
      }))
    );

  const gimmickSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_GIMMICK)
    .setPlaceholder('ステージギミックの有無を選択')
    .addOptions(
      Object.entries(TOGGLE_LABELS).map(([value, label]) => ({
        value,
        label: `ギミック${label}`,
        default: state.gimmick === value,
      }))
    );

  const itemSelect = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_IDS.SELECT_ITEM)
    .setPlaceholder('アイテムの有無を選択')
    .addOptions(
      Object.entries(TOGGLE_LABELS).map(([value, label]) => ({
        value,
        label: `アイテム${label}`,
        default: state.item === value,
      }))
    );

  const isReady = Boolean(state.mode && state.gimmick && state.item);

  const submitButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.SUBMIT_BUTTON)
    .setLabel('募集文を入力して投稿')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!isReady);

  const cancelButton = new ButtonBuilder()
    .setCustomId(CUSTOM_IDS.CANCEL_BUTTON)
    .setLabel('キャンセル')
    .setStyle(ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(modeSelect),
    new ActionRowBuilder().addComponents(gimmickSelect),
    new ActionRowBuilder().addComponents(itemSelect),
    new ActionRowBuilder().addComponents(submitButton, cancelButton),
  ];
}

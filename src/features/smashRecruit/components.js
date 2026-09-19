import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getDraft, setDraft, deleteDraft } from '../../utils/draftStore.js';
import { CUSTOM_IDS, FEATURE_KEY, MODE_LABELS, TOGGLE_LABELS } from './constants.js';
import { buildStatusLine, buildComponents } from './view.js';

function updateSelection(field) {
  return {
    customId: {
      mode: CUSTOM_IDS.SELECT_MODE,
      gimmick: CUSTOM_IDS.SELECT_GIMMICK,
      item: CUSTOM_IDS.SELECT_ITEM,
    }[field],

    async execute(interaction) {
      const state = getDraft(FEATURE_KEY, interaction.user.id) ?? {};
      state[field] = interaction.values[0];
      setDraft(FEATURE_KEY, interaction.user.id, state);

      await interaction.update({
        content: buildStatusLine(state),
        components: buildComponents(state),
      });
    },
  };
}

const selectModeHandler = updateSelection('mode');
const selectGimmickHandler = updateSelection('gimmick');
const selectItemHandler = updateSelection('item');

const cancelButtonHandler = {
  customId: CUSTOM_IDS.CANCEL_BUTTON,
  async execute(interaction) {
    deleteDraft(FEATURE_KEY, interaction.user.id);
    await interaction.update({
      content: '募集をキャンセルしました。',
      components: [],
    });
  },
};

const submitButtonHandler = {
  customId: CUSTOM_IDS.SUBMIT_BUTTON,
  async execute(interaction) {
    const state = getDraft(FEATURE_KEY, interaction.user.id);

    if (!state?.mode || !state?.gimmick || !state?.item) {
      await interaction.reply({
        content: '先に3項目すべてを選択してください。',
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(CUSTOM_IDS.MODAL)
      .setTitle('募集文を入力（任意）');

    const textInput = new TextInputBuilder()
      .setCustomId(CUSTOM_IDS.MODAL_TEXT_INPUT)
      .setLabel('募集文（未入力でも投稿できます）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(300)
      .setPlaceholder('例：初心者歓迎！20時から2時間くらい遊びます');

    modal.addComponents(new ActionRowBuilder().addComponents(textInput));

    await interaction.showModal(modal);
  },
};

const modalHandler = {
  customId: CUSTOM_IDS.MODAL,
  async execute(interaction) {
    const state = getDraft(FEATURE_KEY, interaction.user.id);

    if (!state?.mode || !state?.gimmick || !state?.item) {
      await interaction.reply({
        content: '選択内容が見つかりませんでした。もう一度 /smash-recruit からやり直してください。',
        ephemeral: true,
      });
      return;
    }

    const freeText = interaction.fields.getTextInputValue(CUSTOM_IDS.MODAL_TEXT_INPUT)?.trim();

    const announcement = [
      '@everyone',
      `${interaction.user} がスマブラの対戦相手を募集しています！`,
      '',
      `・対戦形式：${MODE_LABELS[state.mode]}`,
      `・ステージギミック：${TOGGLE_LABELS[state.gimmick]}`,
      `・アイテム：${TOGGLE_LABELS[state.item]}`,
      freeText ? `\n${freeText}` : '',
    ].join('\n');

    const targetChannel = process.env.RECRUIT_CHANNEL_ID
      ? await interaction.client.channels.fetch(process.env.RECRUIT_CHANNEL_ID)
      : interaction.channel;

    await targetChannel.send({
      content: announcement,
      allowedMentions: { parse: ['everyone'] },
    });

    deleteDraft(FEATURE_KEY, interaction.user.id);

    await interaction.reply({
      content: '募集を投稿しました！',
      ephemeral: true,
    });
  },
};

export default [
  selectModeHandler,
  selectGimmickHandler,
  selectItemHandler,
  cancelButtonHandler,
  submitButtonHandler,
  modalHandler,
];

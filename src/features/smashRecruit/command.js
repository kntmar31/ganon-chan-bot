import { SlashCommandBuilder } from 'discord.js';
import { setDraft } from '../../utils/draftStore.js';
import { FEATURE_KEY } from './constants.js';
import { buildStatusLine, buildComponents } from './view.js';

export default {
  data: new SlashCommandBuilder()
    .setName('smash-recruit')
    .setDescription('スマブラを一緒に遊ぶ人を募集します'),

  async execute(interaction) {
    const state = {};
    setDraft(FEATURE_KEY, interaction.user.id, state);

    await interaction.reply({
      content: buildStatusLine(state),
      components: buildComponents(state),
      ephemeral: true,
    });
  },
};

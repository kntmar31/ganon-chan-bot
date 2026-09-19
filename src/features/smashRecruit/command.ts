import { MessageFlags, SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import { setDraft } from '../../utils/draftStore.js'
import type { Command } from '../../types.js'
import { FEATURE_KEY } from './constants.js'
import type { RecruitDraft } from './types.js'
import { buildStatusLine, buildComponents } from './view.js'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('smash-recruit')
    .setDescription('スマブラを一緒に遊ぶ人を募集します'),

  /**
   * /smash-recruit の初期応答。空の入力状態を作り、選択用のメッセージを本人にだけ表示する。
   *
   * @param interaction - スラッシュコマンドのインタラクション
   */
  async execute (interaction: ChatInputCommandInteraction): Promise<void> {
    const state: RecruitDraft = {}
    setDraft(FEATURE_KEY, interaction.user.id, state)

    await interaction.reply({
      content: buildStatusLine(state),
      components: buildComponents(state),
      flags: MessageFlags.Ephemeral
    })
  }
}

export default command

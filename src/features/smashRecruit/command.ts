import { SlashCommandBuilder } from 'discord.js'
import type { ChatInputCommandInteraction } from 'discord.js'
import type { Command } from '../../types.js'
import { buildRecruitModal } from './view.js'

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('smash-recruit')
    .setDescription('スマブラを一緒に遊ぶ人を募集します'),

  /**
   * /smash-recruit の初期応答。募集内容を入力するモーダル(ポップアップ)を表示する。
   *
   * @param interaction - スラッシュコマンドのインタラクション
   */
  async execute (interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.showModal(buildRecruitModal())
  }
}

export default command

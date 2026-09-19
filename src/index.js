import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js';
import dotenv from 'dotenv';
import { loadFeatures } from './features/index.js';
import { BOT_NAME } from './config.js';

dotenv.config();

if (!process.env.DISCORD_TOKEN) {
  console.error('.env に DISCORD_TOKEN を設定してください。');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { commands, components } = await loadFeatures();

// customIdが重複していないかここで検知しておく（機能追加時の事故防止）
client.commands = new Collection(commands.map((command) => [command.data.name, command]));
client.components = new Collection(components.map((component) => [component.customId, component]));

client.once('ready', () => {
  console.log(`${BOT_NAME} が起動しました（アカウント: ${client.user.tag}）`);
  console.log(`読み込んだコマンド: ${[...client.commands.keys()].join(', ')}`);

  client.user.setActivity(`${BOT_NAME}稼働中`, { type: ActivityType.Watching });
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    // ボタン・セレクトメニュー・モーダルはすべてcustomIdで一元的に振り分ける
    if (interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
      const component = client.components.get(interaction.customId);
      if (!component) return;
      await component.execute(interaction);
      return;
    }
  } catch (error) {
    console.error(error);
    if (interaction.isRepliable()) {
      const payload = { content: 'エラーが発生しました。もう一度お試しください。', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

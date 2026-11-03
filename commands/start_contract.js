const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start_contract')
    .setDescription('Открыть запись на контракт')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Действие')
        .setRequired(false)
        .addChoices(
          { name: 'open', value: 'open' }
        )),

  async execute(interaction, contractService, logger) {
    await interaction.deferReply();

    const user = interaction.member;
    if (!user) {
      await interaction.followUp('❌ Не удалось получить информацию о пользователе.');
      return;
    }

    const roleNames = user.roles.cache.map(r => r.name).join(', ');
    logger.info(`Роли пользователя ${user.user.username}: ${roleNames}`);

    const hasRequiredRole = user.roles.cache.some(
      r => r.id === 1548767133482094662 || r.id === 1549020359544676392 || r.name === '・Лидер' || r.name === '・Dep Leader'
    );

    logger.info(`hasRequiredRole: ${hasRequiredRole}`);

    if (!hasRequiredRole) {
      await interaction.followUp('❌ У вас нет прав для использования этой команды.');
      return;
    }

    const contract = await contractService.createContractAsync(
      interaction.channelId,
      interaction.guildId,
      user.id,
      10
    );

    if (!contract) {
      await interaction.followUp('❌ Не удалось создать контракт.');
      return;
    }

    await interaction.followUp('✅ Запись на контракт создана!');
  }
};

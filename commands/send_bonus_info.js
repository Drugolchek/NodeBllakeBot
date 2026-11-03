const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send_bonus_info')
    .setDescription('Отправить описание бонусов (только админ)'),

  async execute(interaction, contractService, logger) {
    await interaction.deferReply();

    const user = interaction.member;
    if (!user) {
      await interaction.followUp('❌ Не удалось получить информацию о пользователе.');
      return;
    }

    const hasAdminRole = user.roles.cache.some(r => r.id === 1549020359544676392);
    if (!hasAdminRole) {
      await interaction.followUp('❌ У вас нет прав для использования этой команды.', { ephemeral: true });
      return;
    }

    const bonusChannelId = 1564337591111647283;
    const bonusChannel = await interaction.guild.channels.fetch(bonusChannelId);

    if (!bonusChannel) {
      await interaction.followUp('❌ Не удалось найти канал для сообщения о бонусах.', { ephemeral: true });
      logger.error(`Канал с ID ${bonusChannelId} не найден`);
      return;
    }

    const embed = {
      title: '🎁 Система бонусов и вознаграждений',
      description: '👋 Привет! Тут расписано бонусы и как их получить! 📋',
      color: 0x800080,
      fields: [
        {
          name: '🎯 Наша главная задача',
          value: '👨‍👩‍👧‍👦 Больше всего набрать людей в нашу семью! 🏆'
        },
        {
          name: '💰 Вознаграждение',
          value: '💵 За каждого приглашенного игрока я буду давать **30 000 виртов**! 💎'
        },
        {
          name: '👤 Каких игроков мы желаем увидеть в нашей семье?',
          value: '❌ **НЕЛЬЗЯ** приглашать игроков, которые приходят только ради выполнения контрактов!\n\n' +
            '✅ **НУЖНЫ** игроки, которые будут с нами играть:\n' +
            '• Фракционные контенты 🏛️\n' +
            '• Семейно-РП контенты 🎭'
        },
        {
          name: '🏆 Дополнительные бонусы',
          value: '🌟 Если вы будете многократно приглашать людей по описанию выше, вам будут выданы:\n' +
            '• Более высокие роли в семье 👑\n' +
            '• Премии и бонусы! 🎁'
        }
      ],
      footer: { text: 'Семья Blake - растем вместе!' },
      timestamp: new Date().toISOString()
    };

    await bonusChannel.send({ embeds: [embed] });
    logger.info(`Описание бонусов отправлено в канал ${bonusChannelId} пользователем ${user.user.username}`);

    await interaction.followUp('✅ Описание бонусов отправлено!', { ephemeral: true });
  }
};

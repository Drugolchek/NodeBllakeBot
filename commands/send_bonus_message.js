const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send_bonus_message')
    .setDescription('Отправить сообщение о бонусах (только админ)'),

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

    const bonusChannelId = 1564338060173250670;
    const bonusChannel = await interaction.guild.channels.fetch(bonusChannelId);

    if (!bonusChannel) {
      await interaction.followUp('❌ Не удалось найти канал для сообщения о бонусах.', { ephemeral: true });
      logger.error(`Канал с ID ${bonusChannelId} не найден`);
      return;
    }

    const embed = {
      title: '🎁 Бонус за приглашение!',
      description: '👋 Привет! Тут ты можешь получить свой бонус за приглашенного игрока в нашу семью! 🎉\n\n' +
        '📊 Просто укажи свой статик и ник приглашенного друга, и мы проверим твою заявку! ✨',
      color: 0xFFD700,
      fields: [
        {
          name: '📝 Как получить бонус?',
          value: '1. Нажми кнопку "Получить" ниже\n' +
            '2. Укажи свой статик (число)\n' +
            '3. Напиши ник приглашенного игрока\n' +
            '4. Отправь заявку и жди проверки! ⏳'
        }
      ],
      footer: { text: 'Семя BlakeBot' },
      timestamp: new Date().toISOString()
    };

    const button = {
      type: 1,
      components: [
        { type: 2, style: 1, custom_id: 'bonus_claim', label: 'Получить бонус', emoji: { name: '🎁' } }
      ]
    };

    await bonusChannel.send({ embeds: [embed], components: [button] });
    logger.info(`Сообщение о бонусах отправлено в канал ${bonusChannelId} пользователем ${user.user.username}`);

    await interaction.followUp('✅ Сообщение о бонусах отправлено!', { ephemeral: true });
  }
};

async function handle(interaction, client, logger) {
  const customId = interaction.customId;

  if (customId === 'bonus_modal') {
    await handleBonusModal(interaction, client, logger);
  }
}

async function handleBonusModal(interaction, client, logger) {
  await interaction.deferReply();

  const guild = interaction.guild;
  const user = interaction.user;

  const applicationChannelId = 1564355506930450472;
  const applicationChannel = await guild.channels.fetch(applicationChannelId);

  if (!applicationChannel) {
    await interaction.followUp('❌ Не удалось найти канал для заявок.', { ephemeral: true });
    logger.error(`Канал с ID ${applicationChannelId} не найден`);
    return;
  }

  const stat = interaction.fields.getTextInputValue('stat');
  const nickname = interaction.fields.getTextInputValue('nickname');

  const embed = {
    title: '🎁 Новая заявка на бонус',
    color: 0xFFD700,
    fields: [
      { name: '👤 Кто отправил заявку', value: `<@${user.id}> (${user.username})`, inline: true },
      { name: '📊 Ваш статик', value: stat, inline: true },
      { name: '🏷️ Ник приведенного', value: nickname, inline: true },
      { name: '📅 Дата отправки', value: new Date().toLocaleString('ru-RU'), inline: true }
    ],
    footer: { text: `ID пользователя: ${user.id}` },
    timestamp: new Date().toISOString()
  };

  await applicationChannel.send({ embeds: [embed] });
  logger.info(`Заявка на бонус отправлена пользователем ${user.username}: статик=${stat}, ник=${nickname}`);

  await interaction.followUp('✅ Заявка успешно отправлена! Ожидайте проверки.', { ephemeral: true });
}

module.exports = { handle };

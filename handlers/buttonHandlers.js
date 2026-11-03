const { ModalBuilder, TextInputStyle, ActionRowBuilder, TextInputBuilder } = require('discord.js');

async function handle(interaction, contractService, logger) {
  const customId = interaction.customId;

  if (customId === 'contract_join') {
    await handleContractJoin(interaction, contractService, logger);
  } else if (customId === 'contract_leave') {
    await handleContractLeave(interaction, contractService, logger);
  } else if (customId === 'contract_cancel') {
    await handleContractCancel(interaction, contractService, logger);
  } else if (customId === 'bonus_claim') {
    await handleBonusClaim(interaction, logger);
  }
}

async function handleContractJoin(interaction, contractService, logger) {
  logger.info(`Попытка записи: пользователь ${interaction.user.id}, сообщение ${interaction.message.id}`);

  const contract = contractService.getContract(interaction.message.id);
  if (!contract) {
    logger.error('Контракт не найден');
    await interaction.reply({ content: '❌ Контракт не найден.', ephemeral: true });
    return;
  }

  logger.info(`Контракт найден: закрыт=${contract.isClosed}, участников=${contract.participants.length}`);

  if (contract.isClosed) {
    logger.error('Запись уже закрыта');
    await interaction.reply({ content: '❌ Запись уже закрыта.', ephemeral: true });
    return;
  }

  if (contract.hasParticipant(interaction.user.id)) {
    logger.error('Пользователь уже записан');
    await interaction.reply({ content: '⚠️ Вы уже записаны.', ephemeral: true });
    return;
  }

  logger.info('Попытка добавить участника...');
  const success = await contractService.joinContractAsync(interaction.message.id, interaction.user.id);
  logger.info(`Результат добавления: ${success}`);

  if (success) {
    await interaction.reply({ content: '✅ Вы успешно записались!', ephemeral: true });
  } else {
    await interaction.reply({ content: '❌ Не удалось записаться. Возможно, достигнут лимит участников.', ephemeral: true });
  }
}

async function handleContractLeave(interaction, contractService, logger) {
  const contract = contractService.getContract(interaction.message.id);
  if (!contract) {
    await interaction.reply({ content: '❌ Контракт не найден.', ephemeral: true });
    return;
  }

  if (contract.isClosed) {
    await interaction.reply({ content: '❌ Запись уже закрыта.', ephemeral: true });
    return;
  }

  if (!contract.hasParticipant(interaction.user.id)) {
    await interaction.reply({ content: '⚠️ Вы не записаны.', ephemeral: true });
    return;
  }

  const success = await contractService.leaveContractAsync(interaction.message.id, interaction.user.id);
  if (success) {
    await interaction.reply({ content: '✅ Вы успешно отписались.', ephemeral: true });
  } else {
    await interaction.reply({ content: '❌ Не удалось отписаться.', ephemeral: true });
  }
}

async function handleContractCancel(interaction, contractService, logger) {
  logger.info(`Попытка отмены: пользователь ${interaction.user.id}, сообщение ${interaction.message.id}`);

  const contract = contractService.getContract(interaction.message.id);
  if (!contract) {
    logger.error('Контракт не найден');
    await interaction.reply({ content: '❌ Контракт не найден.', ephemeral: true });
    return;
  }

  logger.info(`Контракт найден: создатель=${contract.creatorId}, текущий пользователь=${interaction.user.id}`);

  const hasAdminRole = interaction.member?.roles?.cache?.some(r => r.id === 1549020359544676392) || false;

  if (contract.creatorId !== interaction.user.id && !hasAdminRole) {
    logger.error('Пользователь не является создателем и не имеет роли администратора');
    await interaction.reply({ content: '❌ Только создатель или администратор может отменить запись.', ephemeral: true });
    return;
  }

  logger.info('Попытка отмены контракта...');
  const success = await contractService.cancelContractAsync(interaction.message.id, interaction.user.id);
  logger.info(`Результат отмены: ${success}`);

  if (success) {
    await interaction.reply({ content: '✅ Запись отменена.', ephemeral: true });
  } else {
    await interaction.reply({ content: '❌ Не удалось отменить запись.', ephemeral: true });
  }
}

async function handleBonusClaim(interaction, logger) {
  const modal = new ModalBuilder()
    .setCustomId('bonus_modal')
    .setTitle('🎁 Заявка на бонус');

  const statInput = new TextInputBuilder()
    .setCustomId('stat')
    .setLabel('Ваш статик (число)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Например: 100');

  const nicknameInput = new TextInputBuilder()
    .setCustomId('nickname')
    .setLabel('Ник приведенного')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Например: Player123');

  const firstActionRow = new ActionRowBuilder().addComponents(statInput);
  const secondActionRow = new ActionRowBuilder().addComponents(nicknameInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}

module.exports = { handle };

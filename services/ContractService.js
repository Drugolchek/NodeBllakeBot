const Contract = require('../models/Contract');

class ContractService {
  constructor(client, logger, config) {
    this.contracts = new Map();
    this.client = client;
    this.logger = logger;
    this.frame29Url = config.frame29Url || '';
    this.frame30Url = config.frame30Url || '';

    this.logger.info(`Frame_29 URL: ${this.frame29Url}`);
    this.logger.info(`Frame_30 URL: ${this.frame30Url}`);
  }

  getContract(messageId) {
    return this.contracts.get(messageId);
  }

  async createContractAsync(channelId, guildId, creatorId, durationMinutes) {
    if (durationMinutes < 5 || durationMinutes > 10) {
      return null;
    }

    const channel = await this.client.channels.fetch(channelId);
    if (!channel) return null;

    const contract = new Contract(channelId, guildId, creatorId, durationMinutes);

    const embed = this.createContractEmbed(contract);
    const components = this.createContractButtons(contract.isClosed);

    const message = await channel.send({ embeds: [embed], components: [components] });

    contract.messageId = message.id;
    contract.message = message;
    this.contracts.set(message.id, contract);

    this.startAutoCloseTimerAsync(contract);
    this.startPeriodicUpdateTimerAsync(contract);

    return contract;
  }

  async joinContractAsync(messageId, userId) {
    const contract = this.getContract(messageId);
    if (!contract || contract.isClosed) return false;

    this.logger.info(`JoinContract: messageId=${messageId}, userId=${userId}, текущих участников=${contract.participants.length}`);

    if (!contract.addParticipant(userId)) {
      this.logger.error('Не удалось добавить участника');
      return false;
    }

    this.logger.info(`Участник добавлен, всего=${contract.participants.length}`);
    await this.updateContractMessageAsync(contract);
    return true;
  }

  async leaveContractAsync(messageId, userId) {
    const contract = this.getContract(messageId);
    if (!contract || contract.isClosed) return false;

    if (!contract.removeParticipant(userId)) return false;

    await this.updateContractMessageAsync(contract);
    return true;
  }

  async cancelContractAsync(messageId, userId) {
    const contract = this.getContract(messageId);
    if (!contract) return false;

    if (contract.creatorId !== userId) return false;

    await this.closeContractAsync(contract, true);
    return true;
  }

  async addParticipantAsync(messageId, adminId, targetUserId) {
    const contract = this.getContract(messageId);
    if (!contract || contract.isClosed) return false;

    if (contract.creatorId !== adminId) return false;

    if (!contract.addParticipant(targetUserId)) return false;

    await this.updateContractMessageAsync(contract);
    return true;
  }

  async removeParticipantAsync(messageId, adminId, targetUserId) {
    const contract = this.getContract(messageId);
    if (!contract || contract.isClosed) return false;

    if (contract.creatorId !== adminId) return false;

    if (!contract.removeParticipant(targetUserId)) return false;

    await this.updateContractMessageAsync(contract);
    return true;
  }

  async startAutoCloseTimerAsync(contract) {
    const delay = contract.expiresAt - new Date();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!contract.isClosed) {
      await this.closeContractAsync(contract, false);
    }
  }

  async startPeriodicUpdateTimerAsync(contract) {
    while (!contract.isClosed) {
      await new Promise(resolve => setTimeout(resolve, 15000));

      if (contract.isClosed) break;

      const totalDuration = contract.expiresAt - contract.createdAt;
      const elapsed = new Date() - contract.createdAt;
      const halfTime = totalDuration / 2000;

      if (!contract.halfTimeNotified && elapsed >= halfTime) {
        contract.halfTimeNotified = true;
        const timeLeft = this.getTimeRemaining(contract.expiresAt);
        const channel = await this.client.channels.fetch(contract.channelId);
        if (channel) {
          await channel.send(`<@&1549021438009409536> До закрытия записи осталось ${timeLeft} Успейтесь записаться!!!`);
          this.logger.info(`Отправлено уведомление о половине времени для контракта ${contract.messageId}`);
        }
      }

      try {
        await this.updateContractMessageAsync(contract);
      } catch (ex) {
        this.logger.error('Ошибка при периодическом обновлении контракта', ex);
        break;
      }
    }
  }

  async closeContractAsync(contract, cancelled) {
    this.logger.info(`CloseContract: messageId=${contract.messageId}, cancelled=${cancelled}`);
    contract.isClosed = true;
    await this.updateContractMessageAsync(contract, cancelled);
    this.contracts.delete(contract.messageId);
    this.logger.info('Контракт удален из списка');
  }

  async updateContractMessageAsync(contract, cancelled = false) {
    this.logger.info(`UpdateContractMessage: messageId=${contract.messageId}, участников=${contract.participants.length}, isClosed=${contract.isClosed}`);

    let message = contract.message;
    if (!message) {
      this.logger.error('Кэшированное сообщение не найдено, пробуем получить из канала');
      const channel = await this.client.channels.fetch(contract.channelId);
      if (!channel) {
        this.logger.error('Канал не найден');
        return;
      }

      message = await channel.messages.fetch(contract.messageId);
      if (!message) {
        this.logger.error('Сообщение не найдено в канале');
        return;
      }
      contract.message = message;
    }

    const embed = this.createContractEmbed(contract, cancelled);
    const components = this.createContractButtons(contract.isClosed);

    this.logger.info('Обновление сообщения...');

    await message.edit({ embeds: [embed], components: [components] });

    this.logger.info('Сообщение обновлено');
  }

  createContractEmbed(contract, cancelled = false) {
    const guild = this.client.guilds.cache.get(contract.guildId);
    const participantsList = contract.participants
      .map(id => guild?.members.cache.get(id))
      .filter(u => u != null)
      .map(u => `<@${u.id}> (${u.user.username})`)
      .join('\n') || 'Нет участников';

    const status = contract.isClosed ? (cancelled ? '❌ Отменён' : '🔒 Закрыт') : '⏳ Открыт';
    const timeLeft = contract.isClosed ? '0:00' : this.getTimeRemaining(contract.expiresAt);

    const creator = guild?.members.cache.get(contract.creatorId);
    const creatorName = creator?.user?.username || 'Неизвестно';

    const imageUrl = contract.isClosed ? this.frame30Url : this.frame29Url;

    const embed = {
      title: `📋 Запись на контракт ${status}`,
      description: `<@&1549021438009409536>\n\n🎯 Контракт открыт для записи. Нажмите кнопку ниже, чтобы записаться.`,
      color: contract.isClosed ? 0xFF0000 : 0x00FF00,
      fields: [
        { name: '👑 Организатор', value: `<@${contract.creatorId}> (${creatorName})`, inline: true },
        { name: '⏱️ Время до закрытия', value: timeLeft, inline: true },
        { name: '📊 Статус', value: status, inline: true },
        { name: `👥 Участники (${contract.participants.length}/20)`, value: participantsList },
        { name: '📝 Свободных мест', value: contract.availableSlots.toString(), inline: true }
      ],
      timestamp: contract.createdAt.toISOString()
    };

    if (imageUrl) {
      embed.image = { url: imageUrl };
    }

    if (contract.isClosed) {
      embed.footer = { text: cancelled ? 'Запись отменена создателем' : 'Время записи истекло' };
    }

    return embed;
  }

  createContractButtons(isClosed) {
    if (!isClosed) {
      return {
        type: 1,
        components: [
          { type: 2, style: 3, custom_id: 'contract_join', label: '✅ Записаться' },
          { type: 2, style: 4, custom_id: 'contract_leave', label: '❌ Отписаться' },
          { type: 2, style: 2, custom_id: 'contract_cancel', label: '🚫 Отменить' }
        ]
      };
    } else {
      return {
        type: 1,
        components: [
          { type: 2, style: 3, custom_id: 'contract_join', label: '✅ Записаться', disabled: true },
          { type: 2, style: 4, custom_id: 'contract_leave', label: '❌ Отписаться', disabled: true },
          { type: 2, style: 2, custom_id: 'contract_cancel', label: '🚫 Отменить', disabled: true }
        ]
      };
    }
  }

  getTimeRemaining(expiresAt) {
    const remaining = expiresAt - new Date();
    if (remaining <= 0) return '0:00';

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

module.exports = ContractService;

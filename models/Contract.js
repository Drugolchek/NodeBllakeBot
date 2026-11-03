class Contract {
  constructor(channelId, guildId, creatorId, durationMinutes) {
    this.messageId = null;
    this.channelId = channelId;
    this.guildId = guildId;
    this.creatorId = creatorId;
    this.createdAt = new Date();
    this.expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.isClosed = false;
    this.participants = [];
    this.message = null;
    this.halfTimeNotified = false;
    this.maxParticipants = 20;
  }

  canAddParticipant() {
    return this.participants.length < this.maxParticipants && !this.isClosed;
  }

  addParticipant(userId) {
    if (!this.canAddParticipant() || this.participants.includes(userId)) {
      return false;
    }
    this.participants.push(userId);
    return true;
  }

  removeParticipant(userId) {
    const index = this.participants.indexOf(userId);
    if (index > -1) {
      this.participants.splice(index, 1);
      return true;
    }
    return false;
  }

  hasParticipant(userId) {
    return this.participants.includes(userId);
  }

  get availableSlots() {
    return this.maxParticipants - this.participants.length;
  }
}

module.exports = Contract;

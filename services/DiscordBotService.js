const { Client, GatewayIntentBits, Partials } = require('discord.js');
const ContractService = require('./ContractService');
const fs = require('fs');
const path = require('path');

class DiscordBotService {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction]
    });

    this.contractService = new ContractService(this.client, this.logger, this.config);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('ready', () => this.onReady());
    this.client.on('interactionCreate', (interaction) => this.handleInteractionAsync(interaction));
    this.client.on('guildMemberAdd', (member) => this.onUserJoined(member));
    this.client.on('error', (error) => this.logger.error('Discord client error:', error));
  }

  async start() {
    const token = this.config.token;
    if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
      this.logger.error('Пожалуйста, укажите токен бота в config.json');
      return;
    }

    await this.client.login(token);
  }

  async onReady() {
    this.logger.info('Бот успешно подключен!');

    await this.registerCommands();

    this.startKeepAliveTimerAsync();
  }

  async registerCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const commands = [];
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      commands.push(command.data);
    }

    if (this.config.testGuildId) {
      const guild = await this.client.guilds.fetch(this.config.testGuildId);
      await guild.commands.set(commands);
      this.logger.info(`Регистрация команд для тестового сервера: ${this.config.testGuildId}`);
    } else {
      await this.client.application.commands.set(commands);
      this.logger.info('Регистрация команд глобально (может занять до часа)');
    }

    this.logger.info(`Загружено команд: ${commands.length}`);
  }

  async startKeepAliveTimerAsync() {
    const channelId = 1554762515555156008;

    const keepAlive = async () => {
      try {
        const channel = await this.client.channels.fetch(channelId);
        if (channel) {
          await channel.send('ПинГ');
          this.logger.info(`Keep-alive ping отправлен в канал ${channelId}`);
        } else {
          this.logger.warning(`Канал с ID ${channelId} не найден`);
        }
      } catch (ex) {
        this.logger.error('Ошибка в keep-alive таймере', ex);
      }
    };

    setInterval(keepAlive, 5 * 60 * 1000);
  }

  async handleInteractionAsync(interaction) {
    this.logger.info(`Получен interaction: ${interaction.type} от ${interaction.user.username}`);

    try {
      if (interaction.isChatInputCommand()) {
        const commandPath = path.join(__dirname, '../commands', `${interaction.commandName}.js`);
        if (fs.existsSync(commandPath)) {
          const command = require(commandPath);
          await command.execute(interaction, this.contractService, this.logger);
        }
      } else if (interaction.isButton()) {
        const handlerPath = path.join(__dirname, '../handlers', 'buttonHandlers.js');
        if (fs.existsSync(handlerPath)) {
          const handlers = require(handlerPath);
          await handlers.handle(interaction, this.contractService, this.logger);
        }
      } else if (interaction.isModalSubmit()) {
        const handlerPath = path.join(__dirname, '../handlers', 'modalHandlers.js');
        if (fs.existsSync(handlerPath)) {
          const handlers = require(handlerPath);
          await handlers.handle(interaction, this.client, this.logger);
        }
      }
    } catch (ex) {
      this.logger.error('Ошибка при выполнении команды', ex);
      if (interaction.isRepliable()) {
        await interaction.followUp({ content: '❌ Произошла ошибка при выполнении команды.', ephemeral: true });
      }
    }
  }

  async onUserJoined(member) {
    this.logger.info(`Пользователь ${member.user.username} зашел на сервер ${member.guild.name}`);

    try {
      const roleId = 1557804326330699836;
      const role = await member.guild.roles.fetch(roleId);

      if (role) {
        await member.roles.add(roleId);
        this.logger.info(`Выдана роль ${role.name} пользователю ${member.user.username}`);
      } else {
        this.logger.warning(`Роль с ID ${roleId} не найдена на сервере ${member.guild.name}`);
      }
    } catch (ex) {
      this.logger.error(`Ошибка при выдаче роли пользователю ${member.user.username}`, ex);
    }
  }

  async stop() {
    this.client.destroy();
  }
}

module.exports = DiscordBotService;

const fs = require('fs');
const path = require('path');
const DiscordBotService = require('./services/DiscordBotService');

class Logger {
  constructor() {
    this.levels = {
      info: '\x1b[36m[INFO]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
      warning: '\x1b[33m[WARN]\x1b[0m'
    };
  }

  info(message, ...args) {
    console.log(`${this.levels.info} ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`${this.levels.error} ${message}`, ...args);
  }

  warning(message, ...args) {
    console.warn(`${this.levels.warning} ${message}`, ...args);
  }
}

async function main() {
  const logger = new Logger();

  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    logger.error('config.json не найден!');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const botService = new DiscordBotService(config, logger);

  try {
    await botService.start();
  } catch (error) {
    logger.error('Ошибка при запуске бота:', error);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    logger.info('Получен SIGINT, остановка бота...');
    await botService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Получен SIGTERM, остановка бота...');
    await botService.stop();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

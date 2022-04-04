import * as winston from 'winston';
const { combine, timestamp, printf } = winston.format;

const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const options = {
  console: {
    level: 'debug',
    handleExceptions: true,
    colorize: true,
  },
};

const logger: winston.Logger = winston.createLogger({
  format: combine(timestamp(), customFormat),
  transports: [new winston.transports.Console(options.console)],
  exitOnError: false,
});

export default logger;

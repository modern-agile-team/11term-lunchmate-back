import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

export const winstonOptions = new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'silly',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    nestWinstonModuleUtilities.format.nestLike('LunchMate', { colors: true, prettyPrint: true }),
  ),
});

export const winstonLogger = WinstonModule.createLogger({
  transports: [winstonOptions],
});

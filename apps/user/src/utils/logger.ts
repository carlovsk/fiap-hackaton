import { Logger } from 'tslog';

export const logger = (loggerName: string) => new Logger({ name: `users:${loggerName}` });

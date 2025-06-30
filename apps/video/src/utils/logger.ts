import { Logger } from 'tslog';

export const logger = (loggerName: string) => new Logger({ name: `videos:${loggerName}` });

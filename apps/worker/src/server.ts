import express from 'express';
import { startConsumer } from './consumer';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();

startConsumer().catch((err) => {
  logger('server').error('Worker failed to start:', err);
  process.exit(1);
});

app.use(express.json());

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

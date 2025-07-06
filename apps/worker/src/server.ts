import express from 'express';
import { MessageConsumer } from './messaging/consumer';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting worker server...');

const app = express();

// Start messaging consumer
const consumer = new MessageConsumer();
consumer
  .connect()
  .then(() => consumer.startListening())
  .catch((err: Error) => {
    logger('server').error('Message consumer failed to start:', err);
    process.exit(1);
  });

app.use(express.json());

app.listen(env.PORT, () => logger('server').info(`Worker server is running on port ${env.PORT}`));

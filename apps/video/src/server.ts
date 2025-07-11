import express from 'express';
import { MessagingFactory } from './adapters/messaging/factory';
import { startMetricsServer } from './monitoring/metrics';
import { routes } from './routes';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();

// Start messaging consumer using factory
const consumer = MessagingFactory.createConsumer();

consumer
  .connect()
  .then(() => consumer.startListening())
  .catch((err: Error) => {
    logger('server').error('Message consumer failed to start:', err);
    process.exit(1);
  });

app.use(express.json());
app.use(routes);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

startMetricsServer(env.METRICS_PORT || 8080);

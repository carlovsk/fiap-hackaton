import express, { Router } from 'express';
import { HealthController } from './controllers/health.controller';
import { VideosController } from './controllers/video.controller';
import { startConsumer } from './messages';
import { authenticate, upload } from './middlewares';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();
const route = Router();

startConsumer().catch((err) => {
  logger('server').error('Worker failed to start:', err);
  process.exit(1);
});

app.use(express.json());

route.get('/health', HealthController.healthCheck);
route.get('/videos/status', authenticate, new VideosController().list);
route.post('/videos/upload', authenticate, upload.single('file'), new VideosController().upload);
route.get('/videos/:id/download', authenticate, new VideosController().download);

app.use(route);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

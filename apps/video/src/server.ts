import express, { Router } from 'express';
import { HealthController } from './controllers/health.controller';
import { VideosController } from './controllers/video.controller';
import { authenticate, upload } from './middlewares';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();
const route = Router();

app.use(express.json());

route.get('/health', HealthController.healthCheck);
route.get('/videos/status', authenticate, new VideosController().list);
route.post('/videos/upload', authenticate, upload.single('file'), new VideosController().upload);

app.use(route);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

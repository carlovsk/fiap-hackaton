import express, { Router } from 'express';
import { HealthController } from './controllers/health';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();
const route = Router();

app.use(express.json());

route.get('/health', HealthController.healthCheck);

app.use(route);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

import express, { Router } from 'express';
import { HealthController } from './controllers/health.controller';
import { UsersController } from './controllers/users.controller';
import { authenticate } from './middlewares';
import { env } from './utils/env';
import { logger } from './utils/logger';

logger('server').info('Starting server...');

const app = express();
const route = Router();

app.use(express.json());

route.get('/health', HealthController.healthCheck);
route.post('/auth/register', new UsersController().register);
route.post('/auth/signin', new UsersController().signin);
route.post('/auth/refresh', new UsersController().refresh);
route.post('/auth/logout', new UsersController().logout);
route.get('/auth/me', authenticate, new UsersController().me);

app.use(route);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));

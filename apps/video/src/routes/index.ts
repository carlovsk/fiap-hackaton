import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { videoRoutes } from './video.routes';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(videoRoutes);

export { router as routes };

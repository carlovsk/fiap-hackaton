import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

// Health check route
router.get('/health', HealthController.healthCheck);

export { router as healthRoutes };

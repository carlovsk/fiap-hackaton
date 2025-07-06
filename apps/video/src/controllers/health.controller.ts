import { Request, RequestHandler, Response } from 'express';
import { logger } from '../utils/logger';

export class HealthController {
  private static logger = logger('controllers:health');

  static healthCheck: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    HealthController.logger.info('Health check requested');
    res.json({ healthy: true, service: 'video', timestamp: new Date().toISOString() });
  };
}

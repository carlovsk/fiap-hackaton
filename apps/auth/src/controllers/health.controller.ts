import { Request, RequestHandler, Response } from 'express';

export class HealthController {
  static healthCheck: RequestHandler = async (_req: Request, res: Response): Promise<void> => {
    res.json({ healthy: true, service: 'auth', timestamp: new Date().toISOString() });
  };
}

import { Request, RequestHandler, Response } from 'express';
import { CreateUserSchema } from '../schemas';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class UsersController {
  logger = logger('controllers:users');
  authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Register endpoint hit', {
      body: req.body,
    });

    const payload = CreateUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await this.authService.findOneByEmail(payload.email);

    if (existingUser) {
      this.logger.warn('User already exists', {
        email: payload.email,
      });

      res.status(409).send({ error: 'User already exists' });
      return;
    }

    const user = await this.authService.register(payload.email, payload.password);

    res.send({ user });
  };
}

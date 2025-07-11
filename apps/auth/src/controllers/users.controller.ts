import { Request, RequestHandler, Response } from 'express';
import { CreateUserSchema, LogoutSchema, RefreshTokenSchema, SignInSchema } from '../schemas';
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

  signin: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Register endpoint hit', {
      body: req.body,
    });

    const payload = SignInSchema.parse(req.body);

    // Check if user exists
    const user = await this.authService.findOneByEmail(payload.email);

    if (!user) {
      this.logger.warn('User not found', {
        email: payload.email,
      });

      res.status(404).send({ error: 'User not found' });
      return;
    }

    // Compare password
    const isPasswordValid = await this.authService.comparePassword(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn('Invalid password', {
        email: payload.email,
      });

      res.status(401).send({ error: 'Invalid password' });
      return;
    }

    const tokens = await this.authService.signin(user.id);

    res.send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        email: user.email,
        id: user.id,
      },
    });
  };

  me: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Me endpoint hit', {
      user: req.user?.sub,
    });

    if (!req.user?.sub) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const user = await this.authService.findOneById(req.user.sub.toString());

    if (!user) {
      res.status(404).send({ error: 'User not found' });
      return;
    }

    res.send({
      email: user.email,
      id: user.id,
    });
  };

  refresh: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Refresh endpoint hit', {
      body: req.body,
    });

    try {
      const payload = RefreshTokenSchema.parse(req.body);

      const tokens = await this.authService.refresh(payload.refreshToken);

      res.send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      this.logger.warn('Refresh token failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error) {
        if (
          error.message.includes('Invalid') ||
          error.message.includes('expired') ||
          error.message.includes('not found')
        ) {
          res.status(401).send({ error: 'Invalid or expired refresh token' });
          return;
        }
      }

      res.status(500).send({ error: 'Internal server error' });
    }
  };

  logout: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Logout endpoint hit', {
      body: req.body,
    });

    try {
      const payload = LogoutSchema.parse(req.body);

      await this.authService.logout(payload.refreshToken);

      res.send({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.warn('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error) {
        if (error.message.includes('Invalid')) {
          res.status(401).send({ error: 'Invalid refresh token' });
          return;
        }
      }

      res.status(500).send({ error: 'Internal server error' });
    }
  };
}

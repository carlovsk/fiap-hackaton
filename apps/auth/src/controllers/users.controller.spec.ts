import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { UsersController } from './users.controller';

vi.mock('../services/auth.service');
vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('UsersController', () => {
  let usersController: UsersController;
  let mockAuthService: {
    findOneByEmail: MockedFunction<any>;
    register: MockedFunction<any>;
    comparePassword: MockedFunction<any>;
    signin: MockedFunction<any>;
    findOneById: MockedFunction<any>;
    refresh: MockedFunction<any>;
    logout: MockedFunction<any>;
  };
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    usersController = new UsersController();
    mockAuthService = {
      findOneByEmail: vi.fn(),
      register: vi.fn(),
      comparePassword: vi.fn(),
      signin: vi.fn(),
      findOneById: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };
    usersController.authService = mockAuthService as any;
    mockNext = vi.fn();
  });

  describe('register', () => {
    it('[error] should return 409 if user already exists', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();
      const existingUser = {
        id: faker.string.uuid(),
        email,
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };

      const mockReq = {
        body: { email, password },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.findOneByEmail.mockResolvedValue(existingUser);

      await usersController.register(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('[success] should register new user and return user data', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();
      const newUser = {
        id: faker.string.uuid(),
        email,
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };

      const mockReq = {
        body: { email, password },
      } as any;
      const mockRes = {
        send: vi.fn(),
      } as any;

      mockAuthService.findOneByEmail.mockResolvedValue(null);
      mockAuthService.register.mockResolvedValue(newUser);

      await usersController.register(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(mockAuthService.register).toHaveBeenCalledWith(email, password);
      expect(mockRes.send).toHaveBeenCalledWith({ user: newUser });
    });
  });

  describe('signin', () => {
    it('[error] should return 404 if user not found', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();

      const mockReq = {
        body: { email, password },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.findOneByEmail.mockResolvedValue(null);

      await usersController.signin(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('[error] should return 401 if password is invalid', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();
      const user = {
        id: faker.string.uuid(),
        email,
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };

      const mockReq = {
        body: { email, password },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.findOneByEmail.mockResolvedValue(user);
      mockAuthService.comparePassword.mockResolvedValue(false);

      await usersController.signin(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(mockAuthService.comparePassword).toHaveBeenCalledWith(password, user.passwordHash);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid password' });
    });

    it('[success] should return tokens and user data for valid credentials', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();
      const user = {
        id: faker.string.uuid(),
        email,
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };
      const tokens = {
        accessToken: faker.string.alpha(64),
        refreshToken: faker.string.alpha(64),
      };

      const mockReq = {
        body: { email, password },
      } as any;
      const mockRes = {
        send: vi.fn(),
      } as any;

      mockAuthService.findOneByEmail.mockResolvedValue(user);
      mockAuthService.comparePassword.mockResolvedValue(true);
      mockAuthService.signin.mockResolvedValue(tokens);

      await usersController.signin(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneByEmail).toHaveBeenCalledWith(email);
      expect(mockAuthService.comparePassword).toHaveBeenCalledWith(password, user.passwordHash);
      expect(mockAuthService.signin).toHaveBeenCalledWith(user.id);
      expect(mockRes.send).toHaveBeenCalledWith({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          email: user.email,
          id: user.id,
        },
      });
    });
  });

  describe('me', () => {
    it('[error] should return 401 if user is not authenticated', async () => {
      const mockReq = {
        user: undefined,
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await usersController.me(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('[error] should return 401 if user sub is missing', async () => {
      const mockReq = {
        user: {},
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      await usersController.me(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('[error] should return 404 if user not found', async () => {
      const userId = faker.string.uuid();
      const mockReq = {
        user: { sub: userId },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.findOneById.mockResolvedValue(null);

      await usersController.me(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneById).toHaveBeenCalledWith(userId);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('[success] should return user data for authenticated user', async () => {
      const userId = faker.string.uuid();
      const user = {
        id: userId,
        email: faker.internet.email(),
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };

      const mockReq = {
        user: { sub: userId },
      } as any;
      const mockRes = {
        send: vi.fn(),
      } as any;

      mockAuthService.findOneById.mockResolvedValue(user);

      await usersController.me(mockReq, mockRes, mockNext);

      expect(mockAuthService.findOneById).toHaveBeenCalledWith(userId);
      expect(mockRes.send).toHaveBeenCalledWith({
        email: user.email,
        id: user.id,
      });
    });
  });

  describe('refresh', () => {
    it('[error] should return 401 for invalid refresh token', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.refresh.mockRejectedValue(new Error('Invalid or expired refresh token'));

      await usersController.refresh(mockReq, mockRes, mockNext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid or expired refresh token' });
    });

    it('[error] should return 401 for expired refresh token', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.refresh.mockRejectedValue(new Error('Refresh token not found or revoked'));

      await usersController.refresh(mockReq, mockRes, mockNext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid or expired refresh token' });
    });

    it('[error] should return 500 for unknown errors', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.refresh.mockRejectedValue(new Error('Database connection failed'));

      await usersController.refresh(mockReq, mockRes, mockNext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('[success] should return new tokens for valid refresh token', async () => {
      const refreshToken = faker.string.alpha(64);
      const newTokens = {
        accessToken: faker.string.alpha(64),
        refreshToken: faker.string.alpha(64),
      };

      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        send: vi.fn(),
      } as any;

      mockAuthService.refresh.mockResolvedValue(newTokens);

      await usersController.refresh(mockReq, mockRes, mockNext);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.send).toHaveBeenCalledWith({
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      });
    });
  });

  describe('logout', () => {
    it('[error] should return 401 for invalid refresh token', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.logout.mockRejectedValue(new Error('Invalid refresh token'));

      await usersController.logout(mockReq, mockRes, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });

    it('[error] should return 500 for unknown errors', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockAuthService.logout.mockRejectedValue(new Error('Database connection failed'));

      await usersController.logout(mockReq, mockRes, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('[success] should logout user successfully', async () => {
      const refreshToken = faker.string.alpha(64);
      const mockReq = {
        body: { refreshToken },
      } as any;
      const mockRes = {
        send: vi.fn(),
      } as any;

      mockAuthService.logout.mockResolvedValue(undefined);

      await usersController.logout(mockReq, mockRes, mockNext);

      expect(mockAuthService.logout).toHaveBeenCalledWith(refreshToken);
      expect(mockRes.send).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });
  });
});

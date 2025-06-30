import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jwtConfig } from '../config/jwt';
import { authenticate } from './index';

vi.mock('../config/jwt', () => ({
  jwtConfig: {
    accessSecret: faker.string.alpha(32),
    refreshSecret: faker.string.alpha(32),
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  },
}));

describe('authenticate middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('authenticate', () => {
    it('[error] should return 401 if no authorization header is provided', async () => {
      mockReq.headers = {};

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[error] should return 401 if authorization header is malformed', async () => {
      mockReq.headers.authorization = 'InvalidHeaderFormat';

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[error] should return 401 if token is empty', async () => {
      mockReq.headers.authorization = 'Bearer ';

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[error] should return 401 if token is invalid', async () => {
      const invalidToken = faker.string.alpha(64);
      mockReq.headers.authorization = `Bearer ${invalidToken}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[error] should return 401 if token is expired', async () => {
      const userId = faker.string.uuid();
      const expiredToken = jwt.sign({ sub: userId }, jwtConfig.accessSecret, {
        expiresIn: '-1h', // Expired 1 hour ago
      });
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[error] should return 401 if token is signed with wrong secret', async () => {
      const userId = faker.string.uuid();
      const wrongSecret = faker.string.alpha(32);
      const tokenWithWrongSecret = jwt.sign({ sub: userId }, wrongSecret, {
        expiresIn: '15m',
      });
      mockReq.headers.authorization = `Bearer ${tokenWithWrongSecret}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('[success] should authenticate user with valid token and call next', async () => {
      const userId = faker.string.uuid();
      const validToken = jwt.sign({ sub: userId }, jwtConfig.accessSecret, {
        expiresIn: '15m',
      });
      mockReq.headers.authorization = `Bearer ${validToken}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ sub: userId });
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('[success] should handle Bearer token with different casing', async () => {
      const userId = faker.string.uuid();
      const validToken = jwt.sign({ sub: userId }, jwtConfig.accessSecret, {
        expiresIn: '15m',
      });
      mockReq.headers.authorization = `bearer ${validToken}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ sub: userId });
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('[success] should extract user ID from token payload correctly', async () => {
      const userId = faker.string.uuid();
      const validToken = jwt.sign(
        {
          sub: userId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
        },
        jwtConfig.accessSecret,
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;

      authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({ sub: userId });
      expect(mockReq.user.sub).toBe(userId);
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});

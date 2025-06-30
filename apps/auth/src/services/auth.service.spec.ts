import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DateTime } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../database/prisma';
import { AuthService } from './auth.service';

vi.mock('../database/prisma');
vi.mock('../config/jwt', () => ({
  jwtConfig: {
    accessSecret: faker.string.alpha(32),
    refreshSecret: faker.string.alpha(32),
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
  },
}));

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe('signin', () => {
    it('[error] should throw an error if user does not exist', async () => {
      vi.spyOn(authService, 'findOneById').mockResolvedValue(null);

      await expect(authService.signin('non-existent-id')).rejects.toThrow('User not found');
    });

    it('[success] should return access and refresh tokens for a valid user', async () => {
      const userId = faker.string.uuid();
      const user = {
        id: userId,
        email: faker.internet.email(),
        passwordHash: faker.string.alpha(64),
        createdAt: new Date(),
      };
      vi.spyOn(authService, 'findOneById').mockResolvedValue(user);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValueOnce({} as any);

      const tokens = await authService.signin(userId);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('[success] should register a new user with hashed password', async () => {
      const email = faker.internet.email();
      const password = faker.internet.password();
      const hashedPassword = await bcrypt.hash(password, 12);

      vi.spyOn(prisma.user, 'create').mockResolvedValueOnce({
        id: faker.string.uuid(),
        email,
        passwordHash: hashedPassword,
        createdAt: new Date(),
      } as any);

      const user = await authService.register(email, password);

      expect(user).toHaveProperty('id');
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBe(hashedPassword);

      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('[error] should throw an error if refresh token is invalid', async () => {
      const invalidToken = faker.string.alpha(64);
      vi.spyOn(prisma.refreshToken, 'findUnique').mockResolvedValue(null);

      await expect(authService.refresh(invalidToken)).rejects.toThrow('Invalid or expired refresh token');
    });

    it('[error] should throw if refresh token is not found on database', async () => {
      const userId = faker.string.uuid();
      const refreshToken = jwt.sign({ sub: userId }, jwtConfig.refreshSecret, {
        expiresIn: '7d',
      });

      vi.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue(null);

      await expect(authService.refresh(refreshToken)).rejects.toThrow('Refresh token not found or revoked');
    });

    it('[success] should return new access and refresh tokens for a valid refresh token', async () => {
      const userId = faker.string.uuid();
      const existentRefreshTokenId = faker.string.uuid();
      const refreshToken = jwt.sign({ sub: userId }, jwtConfig.refreshSecret, {
        expiresIn: '7d',
      });
      const expiresAt = DateTime.now().plus({ days: 7 }).toJSDate();

      vi.spyOn(prisma.refreshToken, 'findFirst').mockResolvedValue({
        id: existentRefreshTokenId,
        token: refreshToken,
        userId,
        expiresAt,
      } as any);

      vi.spyOn(prisma.refreshToken, 'update').mockResolvedValueOnce({} as any);
      vi.spyOn(authService, 'findOneById').mockResolvedValue({ id: userId } as any);
      vi.spyOn(prisma.refreshToken, 'create').mockResolvedValueOnce({} as any);

      const tokens = await authService.refresh(refreshToken);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        data: { revoked: true },
        where: { id: existentRefreshTokenId },
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: tokens.refreshToken,
          userId,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('logout', () => {
    it('[error] should throw an error if refresh token is invalid', async () => {
      const invalidToken = faker.string.alpha(64);

      await expect(authService.logout(invalidToken)).rejects.toThrow('Invalid refresh token');
    });

    it('[success] should revoke all refresh tokens for a user', async () => {
      const userId = faker.string.uuid();
      const refreshToken = jwt.sign({ sub: userId }, jwtConfig.refreshSecret, {
        expiresIn: '7d',
      });

      vi.spyOn(prisma.refreshToken, 'updateMany').mockResolvedValue({ count: 1 });

      await authService.logout(refreshToken);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          revoked: false,
        },
        data: { revoked: true },
      });
    });
  });
});

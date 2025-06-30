import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { prisma } from '../database/prisma';
import { User, UserSchema } from '../schemas';

export class AuthService {
  constructor() {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async comparePassword(plainTextPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hash);
  }

  async register(email: string, password: string): Promise<User> {
    const hashedPassword = await this.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
      },
    });

    return UserSchema.parse(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? UserSchema.parse(user) : null;
  }

  async findOneById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? UserSchema.parse(user) : null;
  }

  async signin(id: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = jwt.sign({ sub: user.id }, jwtConfig.accessSecret, {
      expiresIn: this.parseExpiresIn(jwtConfig.accessExpiresIn),
    });

    const refreshToken = jwt.sign({ sub: user.id }, jwtConfig.refreshSecret, {
      expiresIn: this.parseExpiresIn(jwtConfig.refreshExpiresIn),
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + this.parseExpiresIn(jwtConfig.refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private parseExpiresIn(exp: string): number {
    const match = /^(\d+)([smhd])$/.exec(exp);

    if (!match) throw new Error('Invalid expiration format');

    const [, value, unit] = match;
    const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];

    if (!multiplier) throw new Error('Invalid time unit');

    return parseInt(value) * multiplier;
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, jwtConfig.refreshSecret) as { sub: string };
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: payload.sub,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      throw new Error('Refresh token not found or revoked');
    }

    // Revoke the old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Generate new tokens
    const user = await this.findOneById(payload.sub);

    if (!user) {
      throw new Error('User not found');
    }

    return this.signin(user.id);
  }

  async logout(refreshToken: string): Promise<void> {
    // Verify refresh token
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, jwtConfig.refreshSecret) as { sub: string };
    } catch {
      throw new Error('Invalid refresh token');
    }

    // Revoke all refresh tokens for the user
    await prisma.refreshToken.updateMany({
      where: {
        userId: payload.sub,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });
  }
}

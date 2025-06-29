import bcrypt from 'bcrypt';
import { prisma } from '../database/prisma';
import { User, UserSchema } from '../schemas';

export class AuthService {
  constructor() {}
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;

    // Hash a password
    const hash = await bcrypt.hash(password, saltRounds);

    return hash;
  }

  private async comparePassword(plainTextPassword: string, hash: string): Promise<boolean> {
    // Compare later
    const isMatch = await bcrypt.compare(plainTextPassword, hash);
    return isMatch;
  }

  async register(email: string, password: string): Promise<User> {
    // Here you would typically hash the password and save the user to a database
    const hashedPassword = await this.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
      },
    });

    // Simulate async operation
    return UserSchema.parse(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return UserSchema.parse(user);
  }
}

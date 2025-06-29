import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.pick({ email: true }).extend({
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const SignInSchema = UserSchema.pick({ email: true }).extend({
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type SignIn = z.infer<typeof SignInSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type Logout = z.infer<typeof LogoutSchema>;

import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    PORT: z.coerce.number(),
    JWT_ACCESS_SECRET: z.coerce.string(),
    JWT_REFRESH_SECRET: z.coerce.string(),
    JWT_ACCESS_EXPIRES_IN: z.coerce.string(),
    JWT_REFRESH_EXPIRES_IN: z.coerce.string(),
  })
  .parse(process.env);

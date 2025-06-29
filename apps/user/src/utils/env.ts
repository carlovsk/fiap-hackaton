import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    PORT: z.coerce.number(),
  })
  .parse(process.env);

import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    PORT: z.coerce.number().default(3000),
    JWT_ACCESS_SECRET: z.coerce.string(),
    JWT_REFRESH_SECRET: z.coerce.string(),
    JWT_ACCESS_EXPIRES_IN: z.coerce.string(),
    JWT_REFRESH_EXPIRES_IN: z.coerce.string(),
    MINIO_ENDPOINT: z.coerce.string(),
    MINIO_ACCESS_KEY: z.coerce.string(),
    MINIO_SECRET_KEY: z.coerce.string(),
    MINIO_BUCKET: z.coerce.string(),
    AWS_REGION: z.coerce.string(),
    DATABASE_URL: z.coerce.string(),
    RABBITMQ_URL: z.coerce.string().default('amqp://rabbitmq:5672'),
    VIDEO_EVENTS_EXCHANGE: z.coerce.string().default('VIDEO_EVENTS_QUEUE'),
    METRICS_PORT: z.coerce.number().default(8080),
  })
  .parse(process.env);

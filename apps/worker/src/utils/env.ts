import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

export const env = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),
    JWT_ACCESS_SECRET: z.coerce.string(),
    JWT_REFRESH_SECRET: z.coerce.string(),
    JWT_ACCESS_EXPIRES_IN: z.coerce.string(),
    JWT_REFRESH_EXPIRES_IN: z.coerce.string(),
    MINIO_ENDPOINT: z.coerce.string().optional(),
    MINIO_ACCESS_KEY: z.coerce.string().optional(),
    MINIO_SECRET_KEY: z.coerce.string().optional(),
    MINIO_BUCKET: z.coerce.string().optional(),
    AWS_REGION: z.coerce.string(),
    S3_BUCKET: z.coerce.string().optional(),
    // Storage adapter type
    STORAGE_ADAPTER: z.enum(['minio', 's3']).default('minio'),
    // RabbitMQ config (for local development)
    RABBITMQ_URL: z.string().default('amqp://rabbitmq:5672'),
    VIDEO_EVENTS_EXCHANGE: z.string().default('video-events'),
    // SQS config (for production)
    SQS_UPLOADS_QUEUE_URL: z.coerce.string().optional(),
    SQS_PROCESSED_QUEUE_URL: z.coerce.string().optional(),
    // Messaging adapter type
    MESSAGING_ADAPTER: z.enum(['rabbitmq', 'sqs']).default('rabbitmq'),
  })
  .parse(process.env);

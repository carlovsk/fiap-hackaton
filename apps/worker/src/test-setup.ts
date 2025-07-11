import { beforeAll } from 'vitest';

// Set up test environment variables before all tests
beforeAll(() => {
  // Storage adapter configuration for tests
  process.env.STORAGE_ADAPTER = 'minio';
  process.env.MINIO_ENDPOINT = 'http://localhost:9000';
  process.env.MINIO_ACCESS_KEY = 'test-access-key';
  process.env.MINIO_SECRET_KEY = 'test-secret-key';
  process.env.MINIO_BUCKET = 'test-bucket';
  process.env.AWS_REGION = 'us-east-1';

  // Messaging adapter configuration for tests
  process.env.MESSAGING_ADAPTER = 'rabbitmq';
  process.env.RABBITMQ_URL = 'amqp://localhost:5672';
  process.env.VIDEO_EVENTS_EXCHANGE = 'test-video-events';

  // JWT configuration for tests
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // Application configuration for tests
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
});

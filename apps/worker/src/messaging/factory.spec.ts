import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the adapters and classes
vi.mock('./adapters/sqs.consumer', () => ({
  SQSMessageConsumer: vi.fn(),
}));

vi.mock('./adapters/sqs.publisher', () => ({
  SQSMessagePublisher: vi.fn(),
}));

vi.mock('./consumer', () => ({
  MessageConsumer: vi.fn(),
}));

vi.mock('./publisher', () => ({
  MessagePublisher: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('MessagingFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createPublisher', () => {
    it('should create SQS publisher when MESSAGING_ADAPTER is sqs', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'sqs' },
      }));

      const { SQSMessagePublisher } = await import('./adapters/sqs.publisher');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createPublisher();

      expect(SQSMessagePublisher).toHaveBeenCalled();
    });

    it('should create RabbitMQ publisher when MESSAGING_ADAPTER is rabbitmq', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'rabbitmq' },
      }));

      const { MessagePublisher } = await import('./publisher');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createPublisher();

      expect(MessagePublisher).toHaveBeenCalled();
    });

    it('should fallback to RabbitMQ publisher for unknown adapter', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'unknown' },
      }));

      const { MessagePublisher } = await import('./publisher');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createPublisher();

      expect(MessagePublisher).toHaveBeenCalled();
    });
  });

  describe('createConsumer', () => {
    it('should create SQS consumer when MESSAGING_ADAPTER is sqs', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'sqs' },
      }));

      const { SQSMessageConsumer } = await import('./adapters/sqs.consumer');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createConsumer();

      expect(SQSMessageConsumer).toHaveBeenCalled();
    });

    it('should create RabbitMQ consumer when MESSAGING_ADAPTER is rabbitmq', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'rabbitmq' },
      }));

      const { MessageConsumer } = await import('./consumer');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createConsumer();

      expect(MessageConsumer).toHaveBeenCalled();
    });

    it('should fallback to RabbitMQ consumer for unknown adapter', async () => {
      vi.doMock('../utils/env', () => ({
        env: { MESSAGING_ADAPTER: 'unknown' },
      }));

      const { MessageConsumer } = await import('./consumer');
      const { MessagingFactory } = await import('./factory');

      MessagingFactory.createConsumer();

      expect(MessageConsumer).toHaveBeenCalled();
    });
  });
});

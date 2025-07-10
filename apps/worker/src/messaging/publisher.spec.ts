import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { MessagePublisher } from './publisher';

vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/env', () => ({
  env: {
    RABBITMQ_URL: 'amqp://localhost:5672',
    VIDEO_EVENTS_EXCHANGE: 'video-events',
  },
}));

// Mock amqplib
vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn(),
  },
}));

const amqplib = await import('amqplib');

describe('MessagePublisher', () => {
  let publisher: MessagePublisher;
  let mockChannel: any;
  let mockConnection: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChannel = {
      assertExchange: vi.fn(),
      publish: vi.fn(),
      close: vi.fn(),
    };

    mockConnection = {
      createChannel: vi.fn().mockResolvedValue(mockChannel),
      close: vi.fn(),
    };

    (amqplib.default.connect as MockedFunction<any>).mockResolvedValue(mockConnection);

    publisher = new MessagePublisher();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await publisher.connect();

      expect(amqplib.default.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('video-events', 'fanout', {
        durable: true,
      });
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      (amqplib.default.connect as MockedFunction<any>).mockRejectedValueOnce(error);

      await expect(publisher.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should publish message successfully', async () => {
      const eventType = 'video.processed';
      const payload = { videoId: 'vid123', status: 'completed' };

      await publisher.publish(eventType, payload);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'video-events',
        '',
        Buffer.from(JSON.stringify({ type: eventType, payload })),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
    });

    it('should throw error when not connected', async () => {
      const disconnectedPublisher = new MessagePublisher();

      await expect(disconnectedPublisher.publish('test', {})).rejects.toThrow('Publisher not connected');
    });

    it('should handle publish errors', async () => {
      const error = new Error('Publish failed');
      mockChannel.publish.mockImplementationOnce(() => {
        throw error;
      });

      await expect(publisher.publish('test', {})).rejects.toThrow('Publish failed');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should disconnect successfully', async () => {
      await publisher.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      const error = new Error('Disconnect failed');
      mockChannel.close.mockRejectedValueOnce(error);

      await expect(publisher.disconnect()).rejects.toThrow('Disconnect failed');
    });

    it('should handle disconnect when not connected', async () => {
      const disconnectedPublisher = new MessagePublisher();

      await expect(disconnectedPublisher.disconnect()).resolves.toBeUndefined();
    });
  });
});

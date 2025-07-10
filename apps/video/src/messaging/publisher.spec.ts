import amqplib from 'amqplib';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { MessagePublisher } from './publisher';

// Mock dependencies
vi.mock('amqplib');
vi.mock('../utils/env', () => ({
  env: {
    RABBITMQ_URL: 'amqp://localhost:5672',
    VIDEO_EVENTS_EXCHANGE: 'video-events',
  },
}));
vi.mock('../utils/logger', () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('MessagePublisher', () => {
  let publisher: MessagePublisher;
  let mockConnection: any;
  let mockChannel: any;
  let mockConnect: Mock;

  beforeEach(() => {
    mockChannel = {
      assertExchange: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: vi.fn().mockResolvedValue(mockChannel),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockConnect = vi.fn().mockResolvedValue(mockConnection);
    (amqplib.connect as Mock) = mockConnect;

    publisher = new MessagePublisher();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await publisher.connect();

      expect(mockConnect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('video-events', 'fanout', { durable: true });
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValue(error);

      await expect(publisher.connect()).rejects.toThrow('Connection failed');
    });

    it('should handle channel creation errors', async () => {
      const error = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValue(error);

      await expect(publisher.connect()).rejects.toThrow('Channel creation failed');
    });

    it('should handle exchange assertion errors', async () => {
      const error = new Error('Exchange assertion failed');
      mockChannel.assertExchange.mockRejectedValue(error);

      await expect(publisher.connect()).rejects.toThrow('Exchange assertion failed');
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should publish message successfully', async () => {
      const eventType = 'video.uploaded';
      const payload = { videoId: 'test-id', userId: 'user-123' };

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

      await expect(disconnectedPublisher.publish('test.event', {})).rejects.toThrow('Publisher not connected');
    });

    it('should handle publish with null payload', async () => {
      const eventType = 'video.deleted';
      const payload = null;

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

    it('should handle publish with undefined payload', async () => {
      const eventType = 'video.processed';
      const payload = undefined;

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
  });

  describe('disconnect', () => {
    it('should disconnect when connected', async () => {
      await publisher.connect();
      await publisher.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await publisher.disconnect();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('should handle partial connection state', async () => {
      // Simulate connection without channel
      const publisher2 = new MessagePublisher();
      (publisher2 as any).connection = mockConnection;

      await publisher2.disconnect();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle channel close errors', async () => {
      await publisher.connect();
      mockChannel.close.mockRejectedValue(new Error('Channel close failed'));

      // Should not throw, but continue to close connection
      await expect(publisher.disconnect()).resolves.not.toThrow();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle connection close errors', async () => {
      await publisher.connect();
      mockConnection.close.mockRejectedValue(new Error('Connection close failed'));

      // Should not throw
      await expect(publisher.disconnect()).resolves.not.toThrow();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});

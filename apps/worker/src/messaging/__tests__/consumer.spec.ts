import amqplib from 'amqplib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../utils/env';
import { logger } from '../../utils/logger';
import { MessageConsumer } from '../consumer';

// Mock dependencies
vi.mock('amqplib');
vi.mock('../../utils/env');
vi.mock('../../utils/logger');
vi.mock('../handlers/videoUploaded.handler', () => ({
  videoUploadedHandler: vi.fn().mockResolvedValue(undefined),
}));

const mockChannel = {
  assertExchange: vi.fn(),
  assertQueue: vi.fn(),
  bindQueue: vi.fn(),
  consume: vi.fn(),
  ack: vi.fn(),
  nack: vi.fn(),
  close: vi.fn(),
};

const mockConnection = {
  createChannel: vi.fn(),
  close: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  log: vi.fn(),
  silly: vi.fn(),
  verbose: vi.fn(),
  child: vi.fn(),
  level: 'info',
  silent: false,
};

describe('MessageConsumer', () => {
  let consumer: MessageConsumer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock functions
    mockChannel.assertExchange.mockReset();
    mockChannel.assertQueue.mockReset();
    mockChannel.bindQueue.mockReset();
    mockChannel.consume.mockReset();
    mockChannel.ack.mockReset();
    mockChannel.nack.mockReset();
    mockChannel.close.mockReset();
    mockConnection.createChannel.mockReset();
    mockConnection.close.mockReset();

    // Mock environment variables
    vi.mocked(env).RABBITMQ_URL = 'amqp://localhost:5672';
    vi.mocked(env).VIDEO_EVENTS_EXCHANGE = 'video-events';

    // Mock logger
    vi.mocked(logger).mockReturnValue(mockLogger as any);

    // Mock amqplib
    vi.mocked(amqplib.connect).mockResolvedValue(mockConnection as any);
    mockConnection.createChannel.mockResolvedValue(mockChannel as any);

    consumer = new MessageConsumer();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockChannel.assertExchange.mockResolvedValueOnce(undefined);

      await consumer.connect();

      expect(amqplib.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('video-events', 'fanout', {
        durable: true,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Message consumer connected successfully');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      vi.mocked(amqplib.connect).mockRejectedValueOnce(error);

      await expect(consumer.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect message consumer:', error);
    });

    it('should handle channel creation errors', async () => {
      const error = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValueOnce(error);

      await expect(consumer.connect()).rejects.toThrow('Channel creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect message consumer:', error);
    });

    it('should handle exchange assertion errors', async () => {
      const error = new Error('Exchange assertion failed');
      mockChannel.assertExchange.mockRejectedValueOnce(error);

      await expect(consumer.connect()).rejects.toThrow('Exchange assertion failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect message consumer:', error);
    });
  });

  describe('startListening', () => {
    beforeEach(async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();
    });

    it('should start listening successfully', async () => {
      const mockQueue = { queue: 'generated-queue-name' };
      mockChannel.assertQueue.mockResolvedValueOnce(mockQueue);
      mockChannel.bindQueue.mockResolvedValueOnce(undefined);
      mockChannel.consume.mockResolvedValueOnce(undefined);

      await consumer.startListening();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('', { exclusive: true });
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('generated-queue-name', 'video-events', '');
      expect(mockLogger.info).toHaveBeenCalledWith('Worker is listening for messages on video-events');
      expect(mockChannel.consume).toHaveBeenCalledWith('generated-queue-name', expect.any(Function));
    });

    it('should throw error when not connected', async () => {
      const disconnectedConsumer = new MessageConsumer();

      await expect(disconnectedConsumer.startListening()).rejects.toThrow('Consumer not connected');
    });

    it('should handle queue assertion errors', async () => {
      const error = new Error('Queue assertion failed');
      mockChannel.assertQueue.mockRejectedValueOnce(error);

      await expect(consumer.startListening()).rejects.toThrow('Queue assertion failed');
    });

    it('should handle queue binding errors', async () => {
      const mockQueue = { queue: 'generated-queue-name' };
      mockChannel.assertQueue.mockResolvedValueOnce(mockQueue);

      const error = new Error('Queue binding failed');
      mockChannel.bindQueue.mockRejectedValueOnce(error);

      await expect(consumer.startListening()).rejects.toThrow('Queue binding failed');
    });
  });

  describe('message processing', () => {
    let messageHandler: (msg: any) => Promise<void>;

    beforeEach(async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      const mockQueue = { queue: 'generated-queue-name' };
      mockChannel.assertQueue.mockResolvedValueOnce(mockQueue);
      mockChannel.bindQueue.mockResolvedValueOnce(undefined);

      // Capture the message handler
      mockChannel.consume.mockImplementation((_queue, handler) => {
        messageHandler = handler;
        return Promise.resolve();
      });

      await consumer.startListening();
    });

    it('should process valid video.uploaded message', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            type: 'video.uploaded',
            payload: { videoId: 'test-123', userId: 'user-456' },
          }),
        ),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.info).toHaveBeenCalledWith('Received event: video.uploaded', {
        videoId: 'test-123',
        userId: 'user-456',
      });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);

      const { videoUploadedHandler } = await import('../handlers/videoUploaded.handler');
      expect(videoUploadedHandler).toHaveBeenCalledWith({ videoId: 'test-123', userId: 'user-456' });
    });

    it('should handle unknown event types', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            type: 'unknown.event',
            payload: { data: 'test' },
          }),
        ),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.warn).toHaveBeenCalledWith('Unhandled event type: unknown.event');
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle message processing errors', async () => {
      const { videoUploadedHandler } = await import('../handlers/videoUploaded.handler');
      vi.mocked(videoUploadedHandler).mockRejectedValueOnce(new Error('Handler failed'));

      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            type: 'video.uploaded',
            payload: { videoId: 'test-123' },
          }),
        ),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to process message:', expect.any(Error));
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle invalid JSON in message', async () => {
      const mockMessage = {
        content: Buffer.from('invalid-json'),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to process message:', expect.any(Error));
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle schema validation errors', async () => {
      const mockMessage = {
        content: Buffer.from(
          JSON.stringify({
            type: 'video.uploaded',
            // Missing required payload
          }),
        ),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to process message:', expect.any(Error));
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle null message', async () => {
      await messageHandler(null);

      // Should return early without processing
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should handle undefined message', async () => {
      await messageHandler(undefined);

      // Should return early without processing
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should handle message with empty content', async () => {
      const mockMessage = {
        content: Buffer.from(''),
      };

      await messageHandler(mockMessage);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to process message:', expect.any(Error));
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully when connected', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      mockChannel.close.mockResolvedValueOnce(undefined);
      mockConnection.close.mockResolvedValueOnce(undefined);

      await consumer.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Message consumer disconnected successfully');
    });

    it('should handle disconnect when not connected', async () => {
      await consumer.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('Message consumer disconnected successfully');
    });

    it('should handle channel close errors', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      const error = new Error('Channel close failed');
      mockChannel.close.mockRejectedValueOnce(error);
      mockConnection.close.mockResolvedValueOnce(undefined);

      await expect(consumer.disconnect()).rejects.toThrow('Channel close failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to disconnect message consumer:', error);
    });

    it('should handle connection close errors', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      mockChannel.close.mockResolvedValueOnce(undefined);
      const error = new Error('Connection close failed');
      mockConnection.close.mockRejectedValueOnce(error);

      await expect(consumer.disconnect()).rejects.toThrow('Connection close failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to disconnect message consumer:', error);
    });

    it('should handle partial disconnect (channel only)', async () => {
      // Simulate having only channel but no connection
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      // Clear connection but keep channel
      (consumer as any).connection = null;

      mockChannel.close.mockResolvedValueOnce(undefined);

      await consumer.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Message consumer disconnected successfully');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple connect calls', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);

      await consumer.connect();
      await consumer.connect(); // Second connect

      expect(amqplib.connect).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple disconnect calls', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      mockChannel.close.mockResolvedValue(undefined);
      mockConnection.close.mockResolvedValue(undefined);

      await consumer.disconnect();
      await consumer.disconnect(); // Second disconnect

      expect(mockLogger.info).toHaveBeenCalledWith('Message consumer disconnected successfully');
    });

    it('should handle startListening after disconnect', async () => {
      mockChannel.assertExchange.mockResolvedValue(undefined);
      await consumer.connect();

      mockChannel.close.mockResolvedValue(undefined);
      mockConnection.close.mockResolvedValue(undefined);
      await consumer.disconnect();

      await expect(consumer.startListening()).rejects.toThrow('Consumer not connected');
    });
  });
});

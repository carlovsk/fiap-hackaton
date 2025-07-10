import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import amqplib from 'amqplib';
import { MessageConsumer } from './consumer';
import { QueuePayloadSchema } from '../schemas/queue.schema';
import { videoProcessedHandler } from './handlers/videoProcessed.handler';

// Mock dependencies
vi.mock('amqplib');
vi.mock('../schemas/queue.schema');
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
vi.mock('./handlers/videoProcessed.handler');

describe('MessageConsumer', () => {
  let consumer: MessageConsumer;
  let mockConnection: any;
  let mockChannel: any;
  let mockConnect: Mock;
  let mockMessage: any;

  beforeEach(() => {
    mockMessage = {
      content: Buffer.from(
        JSON.stringify({
          type: 'video.processed',
          payload: { videoId: 'test-id', status: 'completed' },
        }),
      ),
    };

    mockChannel = {
      assertExchange: vi.fn().mockResolvedValue(undefined),
      assertQueue: vi.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: vi.fn().mockResolvedValue(undefined),
      consume: vi.fn(),
      ack: vi.fn(),
      nack: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      createChannel: vi.fn().mockResolvedValue(mockChannel),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockConnect = vi.fn().mockResolvedValue(mockConnection);
    (amqplib.connect as Mock) = mockConnect;

    // Mock schema validation
    (QueuePayloadSchema.parse as Mock) = vi.fn().mockReturnValue({
      type: 'video.processed',
      payload: { videoId: 'test-id', status: 'completed' },
    });

    consumer = new MessageConsumer();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully on first attempt', async () => {
      await consumer.connect();

      expect(mockConnect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('video-events', 'fanout', { durable: true });
    });

    it('should retry connection on failure and succeed', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValueOnce(mockConnection);

      // Mock setTimeout to resolve immediately to avoid actual delays
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await consumer.connect();

      expect(mockConnect).toHaveBeenCalledTimes(3);

      vi.restoreAllMocks();
    }, 10000);

    it('should fail after max retries', async () => {
      const error = new Error('Connection failed');
      mockConnect.mockRejectedValue(error);

      // Mock setTimeout to resolve immediately to avoid actual delays
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await expect(consumer.connect()).rejects.toThrow('Connection failed');
      expect(mockConnect).toHaveBeenCalledTimes(5);

      vi.restoreAllMocks();
    }, 10000);

    it('should handle channel creation errors', async () => {
      const error = new Error('Channel creation failed');
      mockConnection.createChannel.mockRejectedValue(error);

      // Mock setTimeout to resolve immediately to avoid actual delays
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await expect(consumer.connect()).rejects.toThrow('Channel creation failed');

      vi.restoreAllMocks();
    }, 10000);

    it('should handle exchange assertion errors', async () => {
      const error = new Error('Exchange assertion failed');
      mockChannel.assertExchange.mockRejectedValue(error);

      // Mock setTimeout to resolve immediately to avoid actual delays
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      await expect(consumer.connect()).rejects.toThrow('Exchange assertion failed');

      vi.restoreAllMocks();
    }, 10000);
  });

  describe('startListening', () => {
    beforeEach(async () => {
      await consumer.connect();
    });

    it('should start listening successfully', async () => {
      await consumer.startListening();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('', { exclusive: true });
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('test-queue', 'video-events', '');
      expect(mockChannel.consume).toHaveBeenCalledWith('test-queue', expect.any(Function));
    });

    it('should throw error when not connected', async () => {
      const disconnectedConsumer = new MessageConsumer();

      await expect(disconnectedConsumer.startListening()).rejects.toThrow('Consumer not connected');
    });

    it('should process valid message successfully', async () => {
      await consumer.startListening();

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler with a valid message
      await messageHandler(mockMessage);

      expect(QueuePayloadSchema.parse).toHaveBeenCalledWith({
        type: 'video.processed',
        payload: { videoId: 'test-id', status: 'completed' },
      });
      expect(videoProcessedHandler).toHaveBeenCalledWith({ videoId: 'test-id', status: 'completed' });
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle null message gracefully', async () => {
      await consumer.startListening();

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler with null message
      await messageHandler(null);

      expect(QueuePayloadSchema.parse).not.toHaveBeenCalled();
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON message', async () => {
      await consumer.startListening();

      const invalidMessage = {
        content: Buffer.from('invalid json'),
      };

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler with invalid message
      await messageHandler(invalidMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(invalidMessage, false, false);
    });

    it('should handle schema validation error', async () => {
      (QueuePayloadSchema.parse as Mock).mockImplementation(() => {
        throw new Error('Schema validation failed');
      });

      await consumer.startListening();

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler
      await messageHandler(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle event processing error', async () => {
      (videoProcessedHandler as Mock).mockRejectedValue(new Error('Handler failed'));

      await consumer.startListening();

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler
      await messageHandler(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });

    it('should handle unhandled event type', async () => {
      (QueuePayloadSchema.parse as Mock).mockReturnValue({
        type: 'unknown.event',
        payload: { videoId: 'test-id' },
      });

      await consumer.startListening();

      // Get the message handler
      const messageHandler = mockChannel.consume.mock.calls[0][1];

      // Call the handler
      await messageHandler(mockMessage);

      expect(videoProcessedHandler).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('disconnect', () => {
    it('should disconnect when connected', async () => {
      await consumer.connect();
      await consumer.disconnect();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await consumer.disconnect();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).not.toHaveBeenCalled();
    });

    it('should handle partial connection state', async () => {
      // Simulate connection without channel
      const consumer2 = new MessageConsumer();
      (consumer2 as any).connection = mockConnection;

      await consumer2.disconnect();

      expect(mockChannel.close).not.toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle channel close errors', async () => {
      await consumer.connect();
      mockChannel.close.mockRejectedValue(new Error('Channel close failed'));

      // Should not throw, but continue to close connection
      await expect(consumer.disconnect()).resolves.not.toThrow();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle connection close errors', async () => {
      await consumer.connect();
      mockConnection.close.mockRejectedValue(new Error('Connection close failed'));

      // Should not throw
      await expect(consumer.disconnect()).resolves.not.toThrow();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});

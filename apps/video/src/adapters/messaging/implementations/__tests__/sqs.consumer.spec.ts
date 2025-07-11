import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SQSMessageConsumer } from '../sqs.consumer';

// Mock AWS SDK
vi.mock('@aws-sdk/client-sqs');
vi.mock('../../../../schemas/queue.schema', () => ({
  QueuePayloadSchema: {
    parse: vi.fn(),
  },
}));
vi.mock('../../../../messaging/handlers/videoProcessed.handler', () => ({
  videoProcessedHandler: vi.fn(),
}));
vi.mock('../../../../utils/env', () => ({
  env: {
    AWS_REGION: 'us-east-1',
    SQS_PROCESSED_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/processed-queue',
  },
}));
vi.mock('../../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('SQSMessageConsumer', () => {
  let consumer: SQSMessageConsumer;
  let mockSQSClient: {
    send: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSQSClient = {
      send: vi.fn(),
    };

    (SQSClient as unknown as Mock).mockImplementation(() => mockSQSClient);

    consumer = new SQSMessageConsumer();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(consumer.connect()).resolves.not.toThrow();
      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
    });

    it('should handle connection errors', async () => {
      (SQSClient as unknown as Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(consumer.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('startListening', () => {
    beforeEach(async () => {
      await consumer.connect();
    });

    it('should start listening successfully', async () => {
      vi.spyOn(consumer as any, 'startPolling').mockImplementation(() => {});

      await consumer.startListening();

      expect(consumer['isListening']).toBe(true);
    });

    it('should throw error when not connected', async () => {
      const disconnectedConsumer = new SQSMessageConsumer();

      await expect(disconnectedConsumer.startListening()).rejects.toThrow('SQS Consumer not connected');
    });

    it('should throw error when queue URL not configured', async () => {
      // Create a new consumer with undefined queue URL
      const invalidConsumer = new SQSMessageConsumer();

      // Mock env to return undefined for queue URL
      (invalidConsumer as any).queueUrl = undefined;

      await expect(invalidConsumer.startListening()).rejects.toThrow();
    });
  });

  describe('polling and message processing', () => {
    const mockMessage = {
      Body: JSON.stringify({
        type: 'video.processed',
        payload: { videoId: 'test-id', status: 'completed' },
      }),
      ReceiptHandle: 'receipt-handle-123',
      MessageId: 'message-id-123',
    };

    beforeEach(async () => {
      await consumer.connect();

      // Mock the schema validation
      const { QueuePayloadSchema } = await import('../../../../schemas/queue.schema');
      (QueuePayloadSchema.parse as Mock).mockReturnValue({
        type: 'video.processed',
        payload: { videoId: 'test-id', status: 'completed' },
      });
    });

    it('should process valid message successfully', async () => {
      mockSQSClient.send
        .mockResolvedValueOnce({ Messages: [mockMessage] }) // ReceiveMessage
        .mockResolvedValueOnce({}); // DeleteMessage

      const { videoProcessedHandler } = await import('../../../../messaging/handlers/videoProcessed.handler');
      (videoProcessedHandler as Mock).mockResolvedValue(undefined);

      // Call processMessage directly to test message processing
      await (consumer as any).processMessage(mockMessage);

      expect(videoProcessedHandler).toHaveBeenCalledWith({ videoId: 'test-id', status: 'completed' });
      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    });

    it('should handle message processing errors', async () => {
      const { videoProcessedHandler } = await import('../../../../messaging/handlers/videoProcessed.handler');
      (videoProcessedHandler as Mock).mockRejectedValue(new Error('Handler failed'));

      // Message should not be deleted when processing fails
      await (consumer as any).processMessage(mockMessage);

      expect(videoProcessedHandler).toHaveBeenCalled();
      // Should not delete message on error
      expect(mockSQSClient.send).not.toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    });

    it('should handle schema validation errors', async () => {
      const { QueuePayloadSchema } = await import('../../../../schemas/queue.schema');
      (QueuePayloadSchema.parse as Mock).mockImplementation(() => {
        throw new Error('Schema validation failed');
      });

      await (consumer as any).processMessage(mockMessage);

      // Should not delete message on validation error
      expect(mockSQSClient.send).not.toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    });

    it('should handle missing message body', async () => {
      const invalidMessage = { ReceiptHandle: 'receipt-handle-123' };

      await expect((consumer as any).processMessage(invalidMessage)).resolves.not.toThrow();
    });

    it('should handle unknown event types', async () => {
      const unknownEventMessage = {
        ...mockMessage,
        Body: JSON.stringify({
          type: 'unknown.event',
          payload: { data: 'test' },
        }),
      };

      const { QueuePayloadSchema } = await import('../../../../schemas/queue.schema');
      (QueuePayloadSchema.parse as Mock).mockReturnValue({
        type: 'unknown.event',
        payload: { data: 'test' },
      });

      mockSQSClient.send.mockResolvedValueOnce({}); // DeleteMessage

      await (consumer as any).processMessage(unknownEventMessage);

      // Should still delete message for unknown events
      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully when connected', async () => {
      await consumer.connect();
      consumer['isListening'] = true;
      consumer['pollingInterval'] = setInterval(() => {}, 1000);

      await expect(consumer.disconnect()).resolves.not.toThrow();
      expect(consumer['isListening']).toBe(false);
      expect(consumer['pollingInterval']).toBeNull();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(consumer.disconnect()).resolves.not.toThrow();
    });
  });
});

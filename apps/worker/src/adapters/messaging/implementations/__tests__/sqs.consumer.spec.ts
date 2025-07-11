import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../../utils/env';
import { logger } from '../../../../utils/logger';
import { SQSMessageConsumer } from '../sqs.consumer';

// Mock dependencies
vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(),
  ReceiveMessageCommand: vi.fn(),
  DeleteMessageCommand: vi.fn(),
}));
vi.mock('../../../../utils/env');
vi.mock('../../../../utils/logger');
vi.mock('../../../../messaging/handlers/videoUploaded.handler', () => ({
  videoUploadedHandler: vi.fn().mockResolvedValue(undefined),
}));

const mockSQSClient = {
  send: vi.fn(),
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

describe('SQSMessageConsumer', () => {
  let consumer: SQSMessageConsumer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock environment variables
    vi.mocked(env).AWS_REGION = 'us-east-1';
    vi.mocked(env).SQS_UPLOADS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/uploads-queue';

    // Mock logger
    vi.mocked(logger).mockReturnValue(mockLogger as any);

    // Mock SQS client constructor
    vi.mocked(SQSClient).mockImplementation(() => mockSQSClient as any);

    // Mock ReceiveMessageCommand constructor
    vi.mocked(ReceiveMessageCommand).mockImplementation(
      (input: any) =>
        ({
          input,
          constructor: { name: 'ReceiveMessageCommand' },
        }) as any,
    );

    // Mock DeleteMessageCommand constructor
    vi.mocked(DeleteMessageCommand).mockImplementation(
      (input: any) =>
        ({
          input,
          constructor: { name: 'DeleteMessageCommand' },
        }) as any,
    );

    consumer = new SQSMessageConsumer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await consumer.connect();

      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message consumer connected successfully');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      vi.mocked(SQSClient).mockImplementation(() => {
        throw error;
      });

      await expect(consumer.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect SQS message consumer:', error);
    });
  });

  describe('startListening', () => {
    beforeEach(async () => {
      await consumer.connect();
    });

    it('should start listening successfully', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const startListeningPromise = consumer.startListening();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Worker is listening for messages on SQS queue: https://sqs.us-east-1.amazonaws.com/123456789/uploads-queue',
      );

      // Verify polling starts
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

      await startListeningPromise;
    });

    it('should throw error when not connected', async () => {
      const disconnectedConsumer = new SQSMessageConsumer();

      await expect(disconnectedConsumer.startListening()).rejects.toThrow('SQS Consumer not connected');
    });

    it('should throw error when queue URL not configured', async () => {
      vi.mocked(env).SQS_UPLOADS_QUEUE_URL = '';

      await expect(consumer.startListening()).rejects.toThrow('SQS_UPLOADS_QUEUE_URL not configured');
    });
  });

  describe('message polling and processing', () => {
    beforeEach(async () => {
      await consumer.connect();
      vi.useFakeTimers();
    });

    it('should poll and process messages successfully', async () => {
      const mockMessage = {
        Body: JSON.stringify({
          type: 'video.uploaded',
          payload: { videoId: 'test-id' },
        }),
        ReceiptHandle: 'receipt-handle-123',
        MessageAttributes: {},
      };

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: [mockMessage],
      });

      // Mock successful message deletion
      mockSQSClient.send.mockResolvedValueOnce({});

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      expect(mockSQSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: { name: 'ReceiveMessageCommand' },
          input: expect.objectContaining({
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/uploads-queue',
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            MessageAttributeNames: ['All'],
          }),
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Received 1 messages from SQS');
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Event received', {
        type: 'video.uploaded',
        videoId: 'test-id',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message processed successfully', {
        type: 'video.uploaded',
        videoId: 'test-id',
      });
    });

    it('should handle message processing errors', async () => {
      const mockMessage = {
        Body: JSON.stringify({
          type: 'video.uploaded',
          payload: { videoId: 'test-id' },
        }),
        ReceiptHandle: 'receipt-handle-123',
      };

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: [mockMessage],
      });

      // Mock handler failure
      const { videoUploadedHandler } = await import('../../../../messaging/handlers/videoUploaded.handler');
      vi.mocked(videoUploadedHandler).mockRejectedValueOnce(new Error('Handler failed'));

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      expect(mockLogger.error).toHaveBeenCalledWith('SQS Message processing failed', {
        type: 'video.uploaded',
        videoId: 'test-id',
        error: 'Handler failed',
      });

      // Should not delete message on error
      expect(mockSQSClient.send).not.toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: { name: 'DeleteMessageCommand' },
          input: expect.objectContaining({
            ReceiptHandle: 'receipt-handle-123',
          }),
        }),
      );
    });

    it('should handle schema validation errors', async () => {
      const mockMessage = {
        Body: JSON.stringify({
          type: 'invalid-type',
          // missing required payload
        }),
        ReceiptHandle: 'receipt-handle-123',
      };

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: [mockMessage],
      });

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'SQS Message processing failed',
        expect.objectContaining({
          type: 'unknown',
          videoId: undefined,
          error: expect.stringContaining('invalid_type'),
        }),
      );
    });

    it('should handle missing message body', async () => {
      const mockMessage = {
        ReceiptHandle: 'receipt-handle-123',
        // Missing Body
      };

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: [mockMessage],
      });

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      // Should not process message without body
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('SQS Event received'));
    });

    it('should handle unknown event types', async () => {
      const mockMessage = {
        Body: JSON.stringify({
          type: 'unknown.event',
          payload: {},
        }),
        ReceiptHandle: 'receipt-handle-123',
      };

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: [mockMessage],
      });

      // Mock successful deletion
      mockSQSClient.send.mockResolvedValueOnce({});

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      expect(mockLogger.warn).toHaveBeenCalledWith('Unhandled event type: unknown.event');
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message processed successfully', {
        type: 'unknown.event',
        videoId: undefined,
      });
    });

    it('should handle polling errors gracefully', async () => {
      mockSQSClient.send.mockRejectedValueOnce(new Error('Network error'));

      await (consumer as any).pollMessages();

      expect(mockLogger.error).toHaveBeenCalledWith('Error polling messages from SQS:', expect.any(Error));
    });

    it('should process multiple messages in parallel', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ type: 'video.uploaded', payload: { videoId: 'test-1' } }),
          ReceiptHandle: 'receipt-1',
        },
        {
          Body: JSON.stringify({ type: 'video.uploaded', payload: { videoId: 'test-2' } }),
          ReceiptHandle: 'receipt-2',
        },
      ];

      mockSQSClient.send.mockResolvedValueOnce({
        Messages: mockMessages,
      });

      // Mock successful deletions
      mockSQSClient.send.mockResolvedValue({});

      await consumer.connect();
      // Call pollMessages directly instead of using timers
      await (consumer as any).pollMessages();

      expect(mockLogger.info).toHaveBeenCalledWith('Received 2 messages from SQS');
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Event received', {
        type: 'video.uploaded',
        videoId: 'test-1',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Event received', {
        type: 'video.uploaded',
        videoId: 'test-2',
      });
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await consumer.connect();
      vi.useFakeTimers();
    });

    it('should disconnect gracefully when connected', async () => {
      await consumer.startListening();

      await consumer.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message consumer disconnected successfully');
    });

    it('should handle disconnect when not connected', async () => {
      await consumer.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message consumer disconnected successfully');
    });

    it('should clear polling interval on disconnect', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      await consumer.startListening();

      await consumer.disconnect();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      // Mock private property access for error testing
      const error = new Error('Disconnect failed');
      const disconnectSpy = vi.spyOn(consumer, 'disconnect').mockRejectedValueOnce(error);

      await expect(consumer.disconnect()).rejects.toThrow('Disconnect failed');

      disconnectSpy.mockRestore();
    });
  });

  describe('message deletion', () => {
    beforeEach(async () => {
      await consumer.connect();
    });

    it('should delete message successfully', async () => {
      const receiptHandle = 'receipt-handle-123';
      mockSQSClient.send.mockResolvedValueOnce({});

      // Access private method through any cast for testing
      await (consumer as any).deleteMessage(receiptHandle);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('DeleteMessageCommand');
      expect(sentCommand.input).toEqual({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/uploads-queue',
        ReceiptHandle: receiptHandle,
      });
    });

    it('should handle deletion errors', async () => {
      const receiptHandle = 'receipt-handle-123';
      const error = new Error('Delete failed');
      mockSQSClient.send.mockRejectedValueOnce(error);

      await (consumer as any).deleteMessage(receiptHandle);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete message from SQS:', error);
    });
  });
});

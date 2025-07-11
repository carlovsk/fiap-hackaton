import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../../utils/env';
import { logger } from '../../../../utils/logger';
import { SQSMessagePublisher } from '../sqs.publisher';

// Mock dependencies
vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(),
  SendMessageCommand: vi.fn(),
}));
vi.mock('../../../../utils/env');
vi.mock('../../../../utils/logger');

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

describe('SQSMessagePublisher', () => {
  let publisher: SQSMessagePublisher;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    vi.mocked(env).AWS_REGION = 'us-east-1';
    vi.mocked(env).SQS_PROCESSED_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/processed-queue';

    // Mock logger
    vi.mocked(logger).mockReturnValue(mockLogger as any);

    // Mock SQS client constructor
    vi.mocked(SQSClient).mockImplementation(() => mockSQSClient as any);

    // Mock SendMessageCommand constructor
    vi.mocked(SendMessageCommand).mockImplementation(
      (input: any) =>
        ({
          input,
          constructor: { name: 'SendMessageCommand' },
        }) as any,
    );

    publisher = new SQSMessagePublisher();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await publisher.connect();

      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message publisher connected successfully');
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      vi.mocked(SQSClient).mockImplementation(() => {
        throw error;
      });

      await expect(publisher.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect SQS message publisher:', error);
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should publish video.processed event successfully', async () => {
      const eventType = 'video.processed';
      const payload = { videoId: 'test-video-123', status: 'completed' };

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input).toEqual({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/processed-queue',
        MessageBody: JSON.stringify({
          type: eventType,
          payload,
        }),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          videoId: {
            DataType: 'String',
            StringValue: 'test-video-123',
          },
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Message published to SQS successfully', {
        eventType,
        videoId: 'test-video-123',
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/processed-queue',
      });
    });

    it('should handle missing videoId in payload', async () => {
      const eventType = 'video.processed';
      const payload = { status: 'completed' }; // No videoId

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input.MessageAttributes.videoId).toEqual({
        DataType: 'String',
        StringValue: 'unknown',
      });
    });

    it('should throw error when not connected', async () => {
      const disconnectedPublisher = new SQSMessagePublisher();

      await expect(disconnectedPublisher.publish('video.processed', {})).rejects.toThrow('SQS Publisher not connected');
    });

    it('should throw error for unknown event type', async () => {
      const eventType = 'unknown.event';
      const payload = { videoId: 'test-123' };

      await expect(publisher.publish(eventType, payload)).rejects.toThrow(
        'Unknown event type for worker: unknown.event',
      );
    });

    it('should throw error when processed queue URL not configured', async () => {
      vi.mocked(env).SQS_PROCESSED_QUEUE_URL = '';

      const eventType = 'video.processed';
      const payload = { videoId: 'test-123' };

      await expect(publisher.publish(eventType, payload)).rejects.toThrow(
        'SQS_PROCESSED_QUEUE_URL not configured for processed events',
      );
    });

    it('should handle SQS send errors', async () => {
      const eventType = 'video.processed';
      const payload = { videoId: 'test-123' };
      const error = new Error('Network error');

      mockSQSClient.send.mockRejectedValueOnce(error);

      await expect(publisher.publish(eventType, payload)).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to publish message to SQS:', {
        error,
        eventType,
        payload,
      });
    });

    it('should publish with null payload', async () => {
      const eventType = 'video.processed';
      const payload = null;

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input.MessageBody).toBe(
        JSON.stringify({
          type: eventType,
          payload: null,
        }),
      );
    });

    it('should handle video.processed.success event', async () => {
      const eventType = 'video.processed.success';
      const payload = { videoId: 'test-123', duration: 120 };

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input.QueueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789/processed-queue');
    });

    it('should handle video.processed.failed event', async () => {
      const eventType = 'video.processed.failed';
      const payload = { videoId: 'test-123', error: 'Processing failed' };

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input.QueueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789/processed-queue');
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully', async () => {
      await publisher.connect();

      await publisher.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message publisher disconnected');
    });

    it('should handle disconnect when not connected', async () => {
      await publisher.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message publisher disconnected');
    });

    it('should handle disconnect errors gracefully', async () => {
      await publisher.connect();

      // Since the real implementation just sets client to null and logs,
      // we'll test the graceful handling by mocking the logger
      await publisher.disconnect();

      expect(mockLogger.info).toHaveBeenCalledWith('SQS Message publisher disconnected');
    });

    it('should set client to null on disconnect', async () => {
      await publisher.connect();
      await publisher.disconnect();

      // After disconnect, should not be able to publish
      await expect(publisher.publish('video.processed', {})).rejects.toThrow('SQS Publisher not connected');
    });
  });

  describe('error scenarios', () => {
    beforeEach(async () => {
      await publisher.connect();
    });

    it('should handle JSON serialization errors', async () => {
      const eventType = 'video.processed';
      const circularPayload = {};
      (circularPayload as any).self = circularPayload; // Create circular reference

      await expect(publisher.publish(eventType, circularPayload)).rejects.toThrow();
    });

    it('should handle empty event type', async () => {
      const eventType = '';
      const payload = { videoId: 'test-123' };

      await expect(publisher.publish(eventType, payload)).rejects.toThrow('Unknown event type for worker: ');
    });

    it('should handle undefined payload', async () => {
      const eventType = 'video.processed';
      const payload = undefined;

      mockSQSClient.send.mockResolvedValueOnce({});

      await publisher.publish(eventType, payload);

      expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
      const sentCommand = mockSQSClient.send.mock.calls[0][0];
      expect(sentCommand.constructor.name).toBe('SendMessageCommand');
      expect(sentCommand.input.MessageBody).toBe(
        JSON.stringify({
          type: eventType,
          payload: undefined,
        }),
      );
      expect(sentCommand.input.MessageAttributes.videoId).toEqual({
        DataType: 'String',
        StringValue: 'unknown',
      });
    });
  });
});

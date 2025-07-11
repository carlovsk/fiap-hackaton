import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SQSMessagePublisher } from '../sqs.publisher';

// Mock AWS SDK
vi.mock('@aws-sdk/client-sqs');
vi.mock('../../../../utils/env', () => ({
  env: {
    AWS_REGION: 'us-east-1',
    SQS_UPLOADS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/uploads-queue',
    SQS_PROCESSED_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789/processed-queue',
  },
}));
vi.mock('../../../../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('SQSMessagePublisher', () => {
  let publisher: SQSMessagePublisher;
  let mockSQSClient: {
    send: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSQSClient = {
      send: vi.fn(),
    };

    (SQSClient as unknown as Mock).mockImplementation(() => mockSQSClient);

    publisher = new SQSMessagePublisher();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await expect(publisher.connect()).resolves.not.toThrow();
      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
    });

    it('should handle connection errors', async () => {
      (SQSClient as unknown as Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(publisher.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await publisher.connect();
      mockSQSClient.send.mockResolvedValue({});
    });

    it('should publish video.uploaded event to uploads queue', async () => {
      const payload = { videoId: 'test-id', userId: 'user-123' };

      await publisher.publish('video.uploaded', payload);

      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should publish video.processed event to processed queue', async () => {
      const payload = { videoId: 'test-id', status: 'completed' };

      await publisher.publish('video.processed', payload);

      expect(mockSQSClient.send).toHaveBeenCalledWith(expect.any(SendMessageCommand));
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = { data: 'test' };

      await expect(publisher.publish('unknown.event', payload)).rejects.toThrow('Unknown event type');
    });

    it('should handle missing videoId in payload', async () => {
      const payload = { data: 'test' };

      await publisher.publish('video.uploaded', payload);

      expect(mockSQSClient.send).toHaveBeenCalled();
    });

    it('should handle SQS send errors', async () => {
      const error = new Error('SQS send failed');
      mockSQSClient.send.mockRejectedValue(error);

      await expect(publisher.publish('video.uploaded', { videoId: 'test' })).rejects.toThrow('SQS send failed');
    });

    it('should throw error when not connected', async () => {
      const disconnectedPublisher = new SQSMessagePublisher();

      await expect(disconnectedPublisher.publish('video.uploaded', { videoId: 'test' })).rejects.toThrow(
        'SQS Publisher not connected',
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect gracefully when connected', async () => {
      await publisher.connect();
      await expect(publisher.disconnect()).resolves.not.toThrow();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(publisher.disconnect()).resolves.not.toThrow();
    });
  });
});

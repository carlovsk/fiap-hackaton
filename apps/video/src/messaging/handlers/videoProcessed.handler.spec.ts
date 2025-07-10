import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { VideoProcessedPayloadSchema } from '../../schemas/queue.schema';
import { VideoService } from '../../services/video.service';
import { videoProcessedHandler } from './videoProcessed.handler';

// Mock dependencies
vi.mock('../../schemas/queue.schema');
vi.mock('../../services/video.service');
vi.mock('../../utils/logger', () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('videoProcessedHandler', () => {
  let mockVideoService: any;

  beforeEach(() => {
    mockVideoService = {
      markVideoAsProcessed: vi.fn().mockResolvedValue(undefined),
    };

    (VideoService as Mock).mockImplementation(() => mockVideoService);

    // Mock schema validation
    (VideoProcessedPayloadSchema.parse as Mock) = vi.fn().mockImplementation((payload) => payload);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle video processed event successfully', async () => {
    const payload = {
      videoId: 'test-video-id',
      status: 'completed',
      processedUrl: 'https://example.com/processed-video.mp4',
    };

    await videoProcessedHandler(payload);

    expect(VideoProcessedPayloadSchema.parse).toHaveBeenCalledWith(payload);
    expect(VideoService).toHaveBeenCalled();
    expect(mockVideoService.markVideoAsProcessed).toHaveBeenCalledWith(payload);
  });

  it('should handle schema validation error', async () => {
    const payload = { invalid: 'payload' };
    const error = new Error('Schema validation failed');

    (VideoProcessedPayloadSchema.parse as Mock).mockImplementation(() => {
      throw error;
    });

    await expect(videoProcessedHandler(payload)).rejects.toThrow('Schema validation failed');
    expect(mockVideoService.markVideoAsProcessed).not.toHaveBeenCalled();
  });

  it('should handle video service error', async () => {
    const payload = {
      videoId: 'test-video-id',
      status: 'completed',
      processedUrl: 'https://example.com/processed-video.mp4',
    };
    const error = new Error('Video service failed');

    mockVideoService.markVideoAsProcessed.mockRejectedValue(error);

    await expect(videoProcessedHandler(payload)).rejects.toThrow('Video service failed');
    expect(VideoProcessedPayloadSchema.parse).toHaveBeenCalledWith(payload);
    expect(mockVideoService.markVideoAsProcessed).toHaveBeenCalledWith(payload);
  });

  it('should handle different status values', async () => {
    const payload = {
      videoId: 'test-video-id',
      status: 'failed',
      error: 'Processing failed',
    };

    await videoProcessedHandler(payload);

    expect(VideoProcessedPayloadSchema.parse).toHaveBeenCalledWith(payload);
    expect(mockVideoService.markVideoAsProcessed).toHaveBeenCalledWith(payload);
  });

  it('should handle payload with additional fields', async () => {
    const payload = {
      videoId: 'test-video-id',
      status: 'completed',
      processedUrl: 'https://example.com/processed-video.mp4',
      metadata: {
        duration: 120,
        resolution: '1920x1080',
      },
      extraField: 'should be ignored',
    };

    await videoProcessedHandler(payload);

    expect(VideoProcessedPayloadSchema.parse).toHaveBeenCalledWith(payload);
    expect(mockVideoService.markVideoAsProcessed).toHaveBeenCalledWith(payload);
  });
});

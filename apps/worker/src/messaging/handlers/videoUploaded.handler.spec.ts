import { describe, expect, it, vi } from 'vitest';
import { videoUploadedHandler } from './videoUploaded.handler';

vi.mock('../../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
  }),
}));

vi.mock('../../services/videoProcessing.service', () => ({
  VideoProcessingService: vi.fn().mockImplementation(() => ({
    processVideo: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('videoUploadedHandler', () => {
  it('should process video uploaded event', async () => {
    const payload = {
      videoId: 'video-123',
      userId: 'user-123',
      filename: 'test.mp4',
      key: 'uploads/test.mp4',
    };

    const { VideoProcessingService } = await import('../../services/videoProcessing.service');

    await videoUploadedHandler(payload);

    expect(VideoProcessingService).toHaveBeenCalled();
    const mockInstance = (VideoProcessingService as any).mock.results[0].value;
    expect(mockInstance.processVideo).toHaveBeenCalledWith(payload);
  });

  it('should throw error for invalid payload', async () => {
    const invalidPayload = {
      videoId: 'video-123',
      // missing required fields
    };

    await expect(videoUploadedHandler(invalidPayload)).rejects.toThrow();
  });
});

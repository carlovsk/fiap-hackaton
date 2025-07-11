import { faker } from '@faker-js/faker';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoProcessingService } from './videoProcessing.service';

// Mock the adapters
const mockFileService = {
  downloadFile: vi.fn(),
  extractFrames: vi.fn(),
  zipDirectory: vi.fn(),
  uploadFile: vi.fn(),
};

const mockPublisher = {
  connect: vi.fn(),
  publish: vi.fn(),
};

vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create service with injected dependencies
    service = new VideoProcessingService(mockFileService as any, mockPublisher as any);
  });

  describe('processVideo', () => {
    it('should process video and publish completion event', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };

      await service.processVideo(payload);

      const tempDir = path.join(os.tmpdir(), payload.userId, payload.videoId);
      const videoPath = path.join(tempDir, 'video.mp4');
      const framesDir = path.join(tempDir, 'frames');
      const framesZipPath = path.join(tempDir, 'frames.zip');
      const framesZipKey = `frames/${payload.userId}/${payload.videoId}.zip`;

      expect(mockFileService.downloadFile).toHaveBeenCalledWith({ key: payload.key, targetPath: videoPath });
      expect(mockFileService.extractFrames).toHaveBeenCalledWith(videoPath, framesDir);
      expect(mockFileService.zipDirectory).toHaveBeenCalledWith(framesDir, framesZipPath);
      expect(mockFileService.uploadFile).toHaveBeenCalledWith({
        key: framesZipKey,
        contentType: 'application/zip',
        path: framesZipPath,
      });
      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', {
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'COMPLETED',
        downloadKey: framesZipKey,
      });
    });

    it('should publish failure event and rethrow when a step fails', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };
      const err = new Error('download failed');
      mockFileService.downloadFile.mockRejectedValue(err);

      await expect(service.processVideo(payload)).rejects.toThrow('download failed');

      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', {
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'FAILED',
        downloadKey: null,
      });
    });

    it('should handle non-Error exceptions during processing', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };
      const nonErrorException = 'String error';
      mockFileService.downloadFile.mockRejectedValue(nonErrorException);

      await expect(service.processVideo(payload)).rejects.toBe(nonErrorException);

      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', {
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'FAILED',
        downloadKey: null,
      });
    });
  });

  describe('publishVideoProcessedEvent', () => {
    it('should handle publish errors and rethrow', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        status: 'COMPLETED' as const,
        downloadKey: faker.string.uuid(),
      };
      const publishError = new Error('Publish failed');
      mockPublisher.publish.mockRejectedValue(publishError);

      await expect((service as any).publishVideoProcessedEvent(payload)).rejects.toThrow('Publish failed');

      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', payload);
    });

    it('should handle non-Error publish exceptions', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        status: 'COMPLETED' as const,
        downloadKey: faker.string.uuid(),
      };
      const nonErrorException = 'String publish error';
      mockPublisher.publish.mockRejectedValue(nonErrorException);

      await expect((service as any).publishVideoProcessedEvent(payload)).rejects.toBe(nonErrorException);

      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', payload);
    });
  });
});

import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import os from 'os';
import path from 'path';
import { VideoProcessingService } from './videoProcessing.service';

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
  let mockFileService: {
    downloadFile: MockedFunction<any>;
    extractFrames: MockedFunction<any>;
    zipDirectory: MockedFunction<any>;
    uploadFile: MockedFunction<any>;
  };
  let mockPublisher: { connect: MockedFunction<any>; publish: MockedFunction<any> };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    service = new VideoProcessingService();
    mockFileService = {
      downloadFile: vi.fn(),
      extractFrames: vi.fn(),
      zipDirectory: vi.fn(),
      uploadFile: vi.fn(),
    };
    mockPublisher = { connect: vi.fn(), publish: vi.fn() };
    // @ts-ignore private property access for testing
    service['fileService'] = mockFileService as any;
    // @ts-ignore private property access for testing
    service['messagePublisher'] = mockPublisher as any;
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
      expect(mockFileService.uploadFile).toHaveBeenCalledWith({ key: framesZipKey, contentType: 'application/zip', path: framesZipPath });
      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', { videoId: payload.videoId, userId: payload.userId, status: 'COMPLETED', downloadKey: framesZipKey });
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

      const framesZipKey = `frames/${payload.userId}/${payload.videoId}.zip`;
      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.processed', { videoId: payload.videoId, userId: payload.userId, status: 'FAILED', downloadKey: null });
    });
  });
});

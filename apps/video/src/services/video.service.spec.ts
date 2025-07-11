import { faker } from '@faker-js/faker';
import { v4 as uuid } from 'uuid';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { VideoService } from './video.service';

vi.mock('uuid', () => ({ v4: vi.fn() }));
vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('VideoService', () => {
  let service: VideoService;
  let mockRepository: {
    findByUserId: MockedFunction<any>;
    create: MockedFunction<any>;
    findById: MockedFunction<any>;
    updateById: MockedFunction<any>;
  };
  let mockUploadService: {
    uploadFile: MockedFunction<any>;
    downloadFile: MockedFunction<any>;
  };
  let mockPublisher: { connect: MockedFunction<any>; publish: MockedFunction<any> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepository = {
      findByUserId: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      updateById: vi.fn(),
    };

    mockUploadService = {
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
    };

    mockPublisher = {
      connect: vi.fn(),
      publish: vi.fn(),
    };

    service = new VideoService(mockRepository as any, mockUploadService as any, mockPublisher as any);
  });

  describe('listVideos', () => {
    it('should return videos from repository', async () => {
      const userId = faker.string.uuid();
      const videos = [
        {
          id: faker.string.uuid(),
          userId,
          filename: faker.system.fileName(),
          status: 'COMPLETED',
          createdAt: new Date(),
          downloadKey: faker.string.uuid(),
        },
      ];
      mockRepository.findByUserId.mockResolvedValue(videos);

      const result = await service.listVideos(userId);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(videos);
    });
  });

  describe('uploadVideo', () => {
    it('should upload file, save video and publish event', async () => {
      const userId = faker.string.uuid();
      const file = { originalname: 'video.mp4', buffer: Buffer.from('data') } as any;
      const videoId = faker.string.uuid();
      const key = `videos/${userId}/${videoId}-video.mp4`;
      (uuid as unknown as MockedFunction<any>).mockReturnValue(videoId);
      mockRepository.create.mockResolvedValue({
        id: videoId,
        userId,
        filename: file.originalname,
        status: 'PENDING',
        createdAt: new Date(),
        downloadKey: null,
      });

      const result = await service.uploadVideo(userId, file);

      expect(uuid).toHaveBeenCalled();
      expect(mockUploadService.uploadFile).toHaveBeenCalledWith({ key, file });
      expect(mockRepository.create).toHaveBeenCalledWith({
        id: videoId,
        userId,
        filename: file.originalname,
        status: 'PENDING',
      });
      expect(mockPublisher.connect).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalledWith('video.uploaded', {
        videoId,
        userId,
        filename: file.originalname,
        key,
      });
      expect(result).toEqual({
        id: videoId,
        userId,
        filename: file.originalname,
        status: 'PENDING',
        createdAt: expect.any(Date),
        downloadKey: null,
      });
    });

    it('should not throw if event publish fails', async () => {
      const userId = faker.string.uuid();
      const file = { originalname: 'video.mp4', buffer: Buffer.from('data') } as any;
      const videoId = faker.string.uuid();
      const key = `videos/${userId}/${videoId}-video.mp4`;
      (uuid as unknown as MockedFunction<any>).mockReturnValue(videoId);
      mockRepository.create.mockResolvedValue({
        id: videoId,
        userId,
        filename: file.originalname,
        status: 'PENDING',
        createdAt: new Date(),
        downloadKey: null,
      });
      mockPublisher.publish.mockRejectedValue(new Error('publish fail'));

      const result = await service.uploadVideo(userId, file);

      expect(mockUploadService.uploadFile).toHaveBeenCalledWith({ key, file });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockPublisher.publish).toHaveBeenCalled();
      expect(result.id).toBe(videoId);
    });
  });

  describe('getVideoDownload', () => {
    it('should return null when video not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      const result = await service.getVideoDownload(faker.string.uuid(), faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return null when user mismatch', async () => {
      const video = {
        id: 'id',
        userId: 'other',
        filename: 'a',
        status: 'COMPLETED',
        downloadKey: 'key',
        createdAt: new Date(),
      };
      mockRepository.findById.mockResolvedValue(video);
      const result = await service.getVideoDownload('id', 'user');
      expect(result).toBeNull();
    });

    it('should return null when video not ready', async () => {
      const video = {
        id: 'id',
        userId: 'user',
        filename: 'a',
        status: 'PENDING',
        downloadKey: null,
        createdAt: new Date(),
      };
      mockRepository.findById.mockResolvedValue(video);
      const result = await service.getVideoDownload('id', 'user');
      expect(result).toBeNull();
    });

    it('should return null when file download fails', async () => {
      const video = {
        id: 'id',
        userId: 'user',
        filename: 'a',
        status: 'COMPLETED',
        downloadKey: 'key',
        createdAt: new Date(),
      };
      mockRepository.findById.mockResolvedValue(video);
      mockUploadService.downloadFile.mockResolvedValue(undefined);
      const result = await service.getVideoDownload('id', 'user');
      expect(mockUploadService.downloadFile).toHaveBeenCalledWith('key');
      expect(result).toBeNull();
    });

    it('should return download data when ready', async () => {
      const fileBuffer = Buffer.from('zip');
      const video = {
        id: 'id',
        userId: 'user',
        filename: 'a',
        status: 'COMPLETED',
        downloadKey: 'key',
        createdAt: new Date(),
      };
      mockRepository.findById.mockResolvedValue(video);
      mockUploadService.downloadFile.mockResolvedValue(fileBuffer);
      const result = await service.getVideoDownload('id', 'user');
      expect(result).toEqual({ filename: 'a', content: fileBuffer, downloadKey: 'key' });
    });
  });

  describe('markVideoAsProcessed', () => {
    it('should update video status and downloadKey', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        status: 'COMPLETED' as const,
        downloadKey: faker.string.uuid(),
      };
      mockRepository.updateById.mockResolvedValue(undefined);

      await service.markVideoAsProcessed(payload);

      expect(mockRepository.updateById).toHaveBeenCalledWith(payload.videoId, {
        status: payload.status,
        downloadKey: payload.downloadKey,
      });
    });
  });
});

import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { VideosController } from './video.controller';

vi.mock('../services/video.service');
vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('VideosController', () => {
  let controller: VideosController;
  let mockVideoService: {
    listVideos: MockedFunction<any>;
    uploadVideo: MockedFunction<any>;
    getVideoDownload: MockedFunction<any>;
  };
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    controller = new VideosController();
    mockVideoService = {
      listVideos: vi.fn(),
      uploadVideo: vi.fn(),
      getVideoDownload: vi.fn(),
    };
    // accessing private property for testing
    controller['videoService'] = mockVideoService as any;
    mockNext = vi.fn();
  });

  describe('list', () => {
    it('[error] should return 401 when user is not authenticated', async () => {
      const req = { user: undefined } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await controller.list(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockVideoService.listVideos).not.toHaveBeenCalled();
    });

    it('[success] should return videos for authenticated user', async () => {
      const userId = faker.string.uuid();
      const req = { user: { sub: userId } } as any;
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
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.listVideos.mockResolvedValue(videos);

      await controller.list(req, res, mockNext);

      expect(mockVideoService.listVideos).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ videos });
    });

    it('[error] should return 500 when service throws', async () => {
      const userId = faker.string.uuid();
      const req = { user: { sub: userId } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.listVideos.mockRejectedValue(new Error('fail'));

      await controller.list(req, res, mockNext);

      expect(mockVideoService.listVideos).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('upload', () => {
    it('[error] should return 401 when user is not authenticated', async () => {
      const req = { file: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await controller.upload(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockVideoService.uploadVideo).not.toHaveBeenCalled();
    });

    it('[error] should return 400 when file is missing', async () => {
      const req = { user: { sub: faker.string.uuid() } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await controller.upload(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No file provided' });
      expect(mockVideoService.uploadVideo).not.toHaveBeenCalled();
    });

    it('[success] should upload video and return metadata', async () => {
      const userId = faker.string.uuid();
      const file = {
        originalname: faker.system.fileName(),
      } as any;
      const req = { user: { sub: userId }, file } as any;
      const video = {
        id: faker.string.uuid(),
        filename: file.originalname,
        status: 'PENDING',
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.uploadVideo.mockResolvedValue(video);

      await controller.upload(req, res, mockNext);

      expect(mockVideoService.uploadVideo).toHaveBeenCalledWith(userId, file);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Video uploaded successfully',
        video: {
          id: video.id,
          filename: video.filename,
          status: video.status,
        },
      });
    });

    it('[error] should return 500 when upload fails', async () => {
      const userId = faker.string.uuid();
      const file = { originalname: faker.system.fileName() } as any;
      const req = { user: { sub: userId }, file } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.uploadVideo.mockRejectedValue(new Error('fail'));

      await controller.upload(req, res, mockNext);

      expect(mockVideoService.uploadVideo).toHaveBeenCalledWith(userId, file);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('download', () => {
    it('[error] should return 401 when user is not authenticated', async () => {
      const req = { params: { id: faker.string.uuid() } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      await controller.download(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockVideoService.getVideoDownload).not.toHaveBeenCalled();
    });

    it('[error] should return 404 when download data is not found', async () => {
      const userId = faker.string.uuid();
      const videoId = faker.string.uuid();
      const req = { user: { sub: userId }, params: { id: videoId } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.getVideoDownload.mockResolvedValue(null);

      await controller.download(req, res, mockNext);

      expect(mockVideoService.getVideoDownload).toHaveBeenCalledWith(videoId, userId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Video not found or not ready for download' });
    });

    it('[success] should send video content when available', async () => {
      const userId = faker.string.uuid();
      const videoId = faker.string.uuid();
      const downloadData = {
        filename: faker.system.fileName(),
        content: Buffer.from('zip'),
        downloadKey: faker.string.uuid(),
      };
      const req = { user: { sub: userId }, params: { id: videoId } } as any;
      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      mockVideoService.getVideoDownload.mockResolvedValue(downloadData);

      await controller.download(req, res, mockNext);

      expect(mockVideoService.getVideoDownload).toHaveBeenCalledWith(videoId, userId);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${downloadData.filename}.zip"`,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(downloadData.content);
    });

    it('[error] should return 500 when download fails', async () => {
      const userId = faker.string.uuid();
      const videoId = faker.string.uuid();
      const req = { user: { sub: userId }, params: { id: videoId } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

      mockVideoService.getVideoDownload.mockRejectedValue(new Error('fail'));

      await controller.download(req, res, mockNext);

      expect(mockVideoService.getVideoDownload).toHaveBeenCalledWith(videoId, userId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error downloading file' });
    });
  });
});

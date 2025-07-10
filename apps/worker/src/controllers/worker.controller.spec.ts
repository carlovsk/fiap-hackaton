import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { WorkerController } from './worker.controller';

vi.mock('../services/videoProcessing.service');
vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('WorkerController', () => {
  let controller: WorkerController;
  let mockVideoProcessingService: { processVideo: MockedFunction<any> };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();

    controller = new WorkerController();
    mockVideoProcessingService = { processVideo: vi.fn() };
    (controller as any).videoProcessingService = mockVideoProcessingService;
  });

  describe('handleEvent', () => {
    it('[success] should process video.uploaded event', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };
      const event = { type: 'video.uploaded', payload } as any;

      await controller.handleEvent(event);

      expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(payload);
    });

    it('[success] should ignore unknown events', async () => {
      const event = { type: 'unknown', payload: {} } as any;

      await controller.handleEvent(event);

      expect(mockVideoProcessingService.processVideo).not.toHaveBeenCalled();
    });

    it('[error] should throw for invalid payload', async () => {
      const event = { type: 'video.uploaded', payload: {} } as any;

      await expect(controller.handleEvent(event)).rejects.toThrow();
      expect(mockVideoProcessingService.processVideo).not.toHaveBeenCalled();
    });

    it('[error] should rethrow service errors', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };
      const event = { type: 'video.uploaded', payload } as any;
      const err = new Error('process failed');
      mockVideoProcessingService.processVideo.mockRejectedValue(err);

      await expect(controller.handleEvent(event)).rejects.toThrow('process failed');
      expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(payload);
    });

    it('[error] should handle non-Error exceptions', async () => {
      const payload = {
        videoId: faker.string.uuid(),
        userId: faker.string.uuid(),
        filename: faker.system.fileName(),
        key: faker.string.uuid(),
      };
      const event = { type: 'video.uploaded', payload } as any;
      const nonErrorException = 'String error';
      mockVideoProcessingService.processVideo.mockRejectedValue(nonErrorException);

      await expect(controller.handleEvent(event)).rejects.toBe(nonErrorException);
      expect(mockVideoProcessingService.processVideo).toHaveBeenCalledWith(payload);
    });
  });
});

import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe('healthCheck', () => {
    it('[success] should return healthy status with timestamp', async () => {
      const mockReq = {} as any;
      const mockRes = {
        json: vi.fn(),
      } as any;

      const mockDate = faker.date.recent();
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate.toISOString());

      await HealthController.healthCheck(mockReq, mockRes, vi.fn());

      expect(mockRes.json).toHaveBeenCalledWith({
        healthy: true,
        service: 'video',
        timestamp: mockDate.toISOString(),
      });
    });
  });
});

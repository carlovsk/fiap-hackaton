import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock adapters
vi.mock('../implementations/minio.adapter', () => ({
  MinIOAdapter: vi.fn(),
}));

vi.mock('../implementations/s3.adapter', () => ({
  S3Adapter: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Storage Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('createStorageAdapter', () => {
    it('should create MinIO adapter when STORAGE_ADAPTER is minio', async () => {
      vi.doMock('../../../utils/env', () => ({
        env: { STORAGE_ADAPTER: 'minio' },
      }));

      const { MinIOAdapter } = await import('../implementations/minio.adapter');
      const { createStorageAdapter } = await import('../factory');

      createStorageAdapter();

      expect(MinIOAdapter).toHaveBeenCalled();
    });

    it('should create S3 adapter when STORAGE_ADAPTER is s3', async () => {
      vi.doMock('../../../utils/env', () => ({
        env: { STORAGE_ADAPTER: 's3' },
      }));

      const { S3Adapter } = await import('../implementations/s3.adapter');
      const { createStorageAdapter } = await import('../factory');

      createStorageAdapter();

      expect(S3Adapter).toHaveBeenCalled();
    });

    it('should throw error for unknown storage adapter', async () => {
      vi.doMock('../../../utils/env', () => ({
        env: { STORAGE_ADAPTER: 'unknown' },
      }));

      const { createStorageAdapter } = await import('../factory');

      expect(() => createStorageAdapter()).toThrow('Unknown storage adapter: unknown');
    });
  });
});

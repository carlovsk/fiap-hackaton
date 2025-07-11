import { S3Client } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MinIOAdapter } from './minio.adapter';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  HeadBucketCommand: vi.fn(),
  CreateBucketCommand: vi.fn(),
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn(),
}));

vi.mock('fs', () => ({
  createReadStream: vi.fn(() => 'mock-stream'),
  createWriteStream: vi.fn(() => 'mock-write-stream'),
}));

vi.mock('../utils/logger', () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('MinIOAdapter', () => {
  let adapter: MinIOAdapter;
  let mockSend: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock complete configuration
    vi.doMock('../utils/env', () => ({
      env: {
        MINIO_ENDPOINT: 'localhost:9000',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_BUCKET: 'test-bucket',
        AWS_REGION: 'us-east-1',
      },
    }));

    mockSend = vi.fn();
    (S3Client as any).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', async () => {
      const { MinIOAdapter } = await import('./minio.adapter');
      adapter = new MinIOAdapter();

      expect(adapter).toBeInstanceOf(MinIOAdapter);
      expect(S3Client).toHaveBeenCalled();
    });

    it('should handle incomplete configuration', async () => {
      vi.doMock('../utils/env', () => ({
        env: {
          MINIO_ENDPOINT: '',
          MINIO_ACCESS_KEY: '',
          MINIO_SECRET_KEY: '',
          MINIO_BUCKET: '',
        },
      }));

      const { MinIOAdapter } = await import('./minio.adapter');
      expect(() => new MinIOAdapter()).toThrow('MinIO configuration is incomplete');
    });
  });

  describe('operations', () => {
    beforeEach(async () => {
      vi.doMock('../utils/env', () => ({
        env: {
          MINIO_ENDPOINT: 'localhost:9000',
          MINIO_ACCESS_KEY: 'minioadmin',
          MINIO_SECRET_KEY: 'minioadmin',
          MINIO_BUCKET: 'test-bucket',
          AWS_REGION: 'us-east-1',
        },
      }));

      const { MinIOAdapter } = await import('./minio.adapter');
      adapter = new MinIOAdapter();
    });

    it('should get bucket name', () => {
      expect(adapter.getBucketName()).toBe('test-bucket');
    });

    it('should upload file successfully', async () => {
      mockSend.mockResolvedValue({});
      const mockFile = {
        buffer: Buffer.from('video content'),
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      await adapter.uploadFile({ key: 'test-key', file: mockFile });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should upload file from path successfully', async () => {
      mockSend.mockResolvedValue({});

      await adapter.uploadFileFromPath({
        key: 'test-key',
        path: '/path/to/file',
        contentType: 'video/mp4',
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should download file successfully', async () => {
      mockSend.mockResolvedValue({ Body: 'mock-body' });

      const result = await adapter.downloadFile('test-key');

      expect(result).toBeDefined();
      expect(mockSend).toHaveBeenCalled();
    });

    it('should download file to path successfully', async () => {
      mockSend.mockResolvedValue({ Body: 'mock-body' });

      await adapter.downloadFileToPath({ key: 'test-key', targetPath: '/path/to/file' });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle download errors', async () => {
      mockSend.mockResolvedValue({ Body: null });

      await expect(adapter.downloadFile('test-key')).rejects.toThrow('File not found: test-key');
    });

    it('should handle upload errors', async () => {
      const error = new Error('Upload error');
      mockSend.mockRejectedValue(error);

      const mockFile = {
        buffer: Buffer.from('video content'),
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      await expect(adapter.uploadFile({ key: 'test-key', file: mockFile })).rejects.toThrow('Upload error');
    });

    it('should handle bucket creation', async () => {
      const bucketError = new Error('NoSuchBucket');
      bucketError.name = 'NoSuchBucket';
      mockSend.mockRejectedValueOnce(bucketError).mockResolvedValue({});

      const mockFile = {
        buffer: Buffer.from('video content'),
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      await adapter.uploadFile({ key: 'test-key', file: mockFile });

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadService } from './upload.service';
import { NoSuchBucket, PutObjectCommand, GetObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

vi.mock('../utils/env', () => ({
  env: {
    MINIO_ENDPOINT: 'http://localhost',
    AWS_REGION: 'us-east-1',
    MINIO_ACCESS_KEY: 'key',
    MINIO_SECRET_KEY: 'secret',
    MINIO_BUCKET: 'bucket',
  },
}));
vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Create a mock send function
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const mod = await importOriginal() as any;
  return {
    ...mod,
    S3Client: vi.fn().mockImplementation(() => ({ 
      send: mockSend 
    })),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    CreateBucketCommand: vi.fn(),
    NoSuchBucket: class NoSuchBucket extends Error {},
  };
});

// mock buffer helper
vi.mock('stream/consumers', () => ({ buffer: vi.fn() }));

// Import mocked modules
const { buffer } = await import('stream/consumers');

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UploadService();
    mockSend.mockResolvedValue(undefined);
  });

  describe('uploadFile', () => {
    it('uploads file to bucket', async () => {
      const file = { originalname: 'vid.mp4', buffer: Buffer.from('a'), mimetype: 'video/mp4', size: 1 } as any;
      await service.uploadFile({ key: 'k', file });
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'bucket',
        Key: 'k',
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it('creates bucket when missing', async () => {
      const file = { originalname: 'vid.mp4', buffer: Buffer.from('a'), mimetype: 'video/mp4', size: 1 } as any;
      const err = new (NoSuchBucket as any)();
      mockSend.mockRejectedValueOnce(err).mockResolvedValueOnce({}).mockResolvedValueOnce({});
      await service.uploadFile({ key: 'k', file });
      expect(CreateBucketCommand).toHaveBeenCalledWith({ Bucket: 'bucket' });
      expect(mockSend).toHaveBeenCalledTimes(3); // First fails, then create bucket, then retry upload
    });
  });

  describe('downloadFile', () => {
    it('returns file buffer', async () => {
      const body = {} as any;
      mockSend.mockResolvedValueOnce({ Body: body });
      (buffer as any).mockResolvedValue(Buffer.from('zip'));
      const result = await service.downloadFile('k');
      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket', Key: 'k' });
      expect(result).toEqual(Buffer.from('zip'));
    });

    it('throws when file is missing', async () => {
      mockSend.mockResolvedValueOnce({ Body: undefined });
      await expect(service.downloadFile('k')).rejects.toThrow('File not found: k');
    });
  });
});

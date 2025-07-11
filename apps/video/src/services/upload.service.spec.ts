import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadService } from './upload.service';

// Mock the storage adapters
const mockStorageAdapter = {
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  uploadFileFromPath: vi.fn(),
  downloadFileToPath: vi.fn(),
  getBucketName: vi.fn().mockReturnValue('test-bucket'),
};

vi.mock('../adapters/storage.factory', () => ({
  createStorageAdapter: vi.fn(() => mockStorageAdapter),
}));

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UploadService();
  });

  describe('uploadFile', () => {
    it('uploads file using storage adapter', async () => {
      const file = {
        originalname: 'video.mp4',
        buffer: Buffer.from('test'),
        mimetype: 'video/mp4',
        size: 4,
      } as Express.Multer.File;

      await service.uploadFile({ key: 'test-key', file });

      expect(mockStorageAdapter.uploadFile).toHaveBeenCalledWith({
        key: 'test-key',
        file,
      });
    });

    it('propagates adapter errors', async () => {
      const file = {
        originalname: 'video.mp4',
        buffer: Buffer.from('test'),
        mimetype: 'video/mp4',
        size: 4,
      } as Express.Multer.File;

      const error = new Error('Storage adapter error');
      mockStorageAdapter.uploadFile.mockRejectedValue(error);

      await expect(service.uploadFile({ key: 'test-key', file })).rejects.toThrow('Storage adapter error');
    });
  });

  describe('downloadFile', () => {
    it('downloads file using storage adapter', async () => {
      const expectedBuffer = Buffer.from('file content');
      mockStorageAdapter.downloadFile.mockResolvedValue(expectedBuffer);

      const result = await service.downloadFile('test-key');

      expect(mockStorageAdapter.downloadFile).toHaveBeenCalledWith('test-key');
      expect(result).toBe(expectedBuffer);
    });

    it('propagates adapter errors', async () => {
      const error = new Error('File not found');
      mockStorageAdapter.downloadFile.mockRejectedValue(error);

      await expect(service.downloadFile('test-key')).rejects.toThrow('File not found');
    });
  });
});

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import { Readable } from 'stream';
import { buffer } from 'stream/consumers';
import { pipeline } from 'stream/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../../utils/env';
import { logger } from '../../../../utils/logger';
import { S3Adapter } from '../s3.adapter';

// Mock dependencies
vi.mock('@aws-sdk/client-s3');
vi.mock('fs');
vi.mock('stream/consumers');
vi.mock('stream/promises');
vi.mock('../../../../utils/env');
vi.mock('../../../../utils/logger');

const mockS3Client = {
  send: vi.fn(),
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  log: vi.fn(),
  silly: vi.fn(),
  verbose: vi.fn(),
  child: vi.fn(),
  level: 'info',
  silent: false,
};

describe('S3Adapter', () => {
  let adapter: S3Adapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    vi.mocked(env).AWS_REGION = 'us-east-1';
    vi.mocked(env).S3_BUCKET = 'test-bucket';

    // Mock logger
    vi.mocked(logger).mockReturnValue(mockLogger as any);

    // Mock S3Client
    vi.mocked(S3Client).mockImplementation(() => mockS3Client as any);

    adapter = new S3Adapter();
  });

  describe('constructor', () => {
    it('should initialize successfully with valid configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
      });
    });

    it('should throw error when S3_BUCKET is missing', () => {
      vi.mocked(env).S3_BUCKET = undefined;

      expect(() => new S3Adapter()).toThrow('S3 configuration is incomplete. Required: S3_BUCKET');
    });

    it('should throw error when S3_BUCKET is empty', () => {
      vi.mocked(env).S3_BUCKET = '';

      expect(() => new S3Adapter()).toThrow('S3 configuration is incomplete. Required: S3_BUCKET');
    });
  });

  describe('getBucketName', () => {
    it('should return the configured bucket name', () => {
      const bucketName = adapter.getBucketName();
      expect(bucketName).toBe('test-bucket');
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('test content'),
        size: 12,
      } as Express.Multer.File;

      mockS3Client.send.mockResolvedValueOnce({});

      await adapter.uploadFile({ key: 'path/to/file.txt', file: mockFile });

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(mockLogger.info).toHaveBeenCalledWith('Uploading file to S3', {
        key: 'path/to/file.txt',
        fileName: 'test.txt',
        size: 12,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('File upload completed', {
        key: 'path/to/file.txt',
      });
    });

    it('should handle upload errors', async () => {
      const mockFile = {
        originalname: 'error.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('content'),
        size: 7,
      } as Express.Multer.File;

      const error = new Error('Upload failed');
      mockS3Client.send.mockRejectedValueOnce(error);

      await expect(adapter.uploadFile({ key: 'error/file.txt', file: mockFile })).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadFileFromPath', () => {
    it('should upload file from path successfully', async () => {
      const mockStream = new Readable({
        read() {
          this.push('file content');
          this.push(null);
        },
      });

      vi.mocked(fs.createReadStream).mockReturnValueOnce(mockStream as any);
      mockS3Client.send.mockResolvedValueOnce({});

      await adapter.uploadFileFromPath({
        key: 'path/to/file.txt',
        path: '/local/path/file.txt',
        contentType: 'text/plain',
      });

      expect(fs.createReadStream).toHaveBeenCalledWith('/local/path/file.txt');
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(mockLogger.info).toHaveBeenCalledWith('Uploading file from path to S3', {
        key: 'path/to/file.txt',
        path: '/local/path/file.txt',
        contentType: 'text/plain',
      });
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      vi.mocked(fs.createReadStream).mockImplementationOnce(() => {
        throw error;
      });

      await expect(
        adapter.uploadFileFromPath({
          key: 'error/file.txt',
          path: '/missing/file.txt',
          contentType: 'text/plain',
        }),
      ).rejects.toThrow('File not found');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockBody = new Readable({
        read() {
          this.push('file content');
          this.push(null);
        },
      });

      const mockResponse = {
        Body: mockBody,
      };

      const fileBuffer = Buffer.from('file content');
      mockS3Client.send.mockResolvedValueOnce(mockResponse);
      vi.mocked(buffer).mockResolvedValueOnce(fileBuffer);

      const result = await adapter.downloadFile('path/to/file.txt');

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(buffer).toHaveBeenCalledWith(mockBody);
      expect(result).toEqual(fileBuffer);
      expect(mockLogger.info).toHaveBeenCalledWith('Downloading file from S3', {
        key: 'path/to/file.txt',
      });
    });

    it('should handle missing file body', async () => {
      const mockResponse = {
        // Body is missing
      };

      mockS3Client.send.mockResolvedValueOnce(mockResponse);

      await expect(adapter.downloadFile('missing/file.txt')).rejects.toThrow('File not found: missing/file.txt');

      expect(mockLogger.error).toHaveBeenCalledWith('File not found in storage', {
        key: 'missing/file.txt',
      });
    });
  });

  describe('downloadFileToPath', () => {
    it('should download file to path successfully', async () => {
      const mockBody = new Readable({
        read() {
          this.push('file content');
          this.push(null);
        },
      });

      const mockResponse = { Body: mockBody };
      const mockWriteStream = { write: vi.fn(), end: vi.fn() };

      mockS3Client.send.mockResolvedValueOnce(mockResponse);
      vi.mocked(fs.createWriteStream).mockReturnValueOnce(mockWriteStream as any);
      vi.mocked(pipeline).mockResolvedValueOnce(undefined);

      await adapter.downloadFileToPath({
        key: 'path/to/file.txt',
        targetPath: '/local/target/file.txt',
      });

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(GetObjectCommand));
      expect(fs.createWriteStream).toHaveBeenCalledWith('/local/target/file.txt');
      expect(pipeline).toHaveBeenCalledWith(mockBody, mockWriteStream);
      expect(mockLogger.info).toHaveBeenCalledWith('Downloading file from S3 to path', {
        key: 'path/to/file.txt',
        targetPath: '/local/target/file.txt',
      });
    });
  });
});

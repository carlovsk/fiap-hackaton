import archiver from 'archiver';
import { spawn } from 'child_process';
import fs from 'fs';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { FileService } from './upload.service';

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

vi.mock('../utils/logger', () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('fs');
vi.mock('archiver');
vi.mock('child_process');

const fsMock = fs as unknown as Record<string, MockedFunction<any>>;
const archiverMock = archiver as unknown as MockedFunction<any>;
const spawnMock = spawn as unknown as MockedFunction<any>;

describe('FileService', () => {
  let service: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService();
  });

  describe('uploadFile', () => {
    it('uploads file using storage adapter', async () => {
      await service.uploadFile({
        key: 'test-key',
        contentType: 'application/zip',
        path: '/test/path.zip',
      });

      expect(mockStorageAdapter.uploadFileFromPath).toHaveBeenCalledWith({
        key: 'test-key',
        path: '/test/path.zip',
        contentType: 'application/zip',
      });
    });
  });

  describe('downloadFile', () => {
    it('downloads file using storage adapter', async () => {
      await service.downloadFile({
        key: 'test-key',
        targetPath: '/test/target.zip',
      });

      expect(mockStorageAdapter.downloadFileToPath).toHaveBeenCalledWith({
        key: 'test-key',
        targetPath: '/test/target.zip',
      });
    });
  });

  describe('zipDirectory', () => {
    it('creates zip archive of directory', async () => {
      const mockArchive = {
        pipe: vi.fn(),
        directory: vi.fn(),
        finalize: vi.fn(),
        on: vi.fn(),
        pointer: vi.fn().mockReturnValue(1024),
      };
      archiverMock.mockReturnValue(mockArchive);

      const mockWriteStream = {
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            // Immediately call the callback to simulate stream close
            setImmediate(callback);
          }
          return mockWriteStream;
        }),
      };
      fsMock.createWriteStream = vi.fn().mockReturnValue(mockWriteStream);

      await service.zipDirectory('/source/dir', '/output/file.zip');

      expect(fsMock.createWriteStream).toHaveBeenCalledWith('/output/file.zip');
      expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockArchive.directory).toHaveBeenCalledWith('/source/dir', false);
      expect(mockArchive.finalize).toHaveBeenCalled();
      expect(mockWriteStream.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockArchive.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('extractFrames', () => {
    it('extracts frames from video using ffmpeg', async () => {
      fsMock.existsSync = vi.fn().mockReturnValue(false);
      fsMock.mkdirSync = vi.fn();

      const mockFFmpeg = {
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        }),
      };
      spawnMock.mockReturnValue(mockFFmpeg);

      const promise = service.extractFrames('/input/video.mp4', '/output/frames');

      // Simulate ffmpeg close with success
      const closeCallback = mockFFmpeg.on.mock.calls.find(([event]) => event === 'close')?.[1];
      if (closeCallback) closeCallback(0);

      await promise;

      expect(fsMock.mkdirSync).toHaveBeenCalledWith('/output/frames', { recursive: true });
      expect(spawnMock).toHaveBeenCalledWith('ffmpeg', [
        '-i',
        '/input/video.mp4',
        '-vf',
        'fps=1',
        '/output/frames/frame-%04d.jpg',
      ]);
    });

    it('rejects when ffmpeg fails', async () => {
      fsMock.existsSync = vi.fn().mockReturnValue(true);

      const mockFFmpeg = {
        stderr: {
          on: vi.fn(),
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0);
          }
        }),
      };
      spawnMock.mockReturnValue(mockFFmpeg);

      const promise = service.extractFrames('/input/video.mp4', '/output/frames');

      // Simulate ffmpeg close with error
      const closeCallback = mockFFmpeg.on.mock.calls.find(([event]) => event === 'close')?.[1];
      if (closeCallback) closeCallback(1);

      await expect(promise).rejects.toThrow('ffmpeg exited with code 1');
    });
  });
});

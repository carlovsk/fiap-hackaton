import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { FileService } from './upload.service';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import { spawn } from 'child_process';

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
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// Create shared mock for S3Client send method
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('fs');
vi.mock('stream/promises', () => ({ pipeline: vi.fn() }));
vi.mock('archiver');
vi.mock('child_process', () => ({ spawn: vi.fn() }));

const { PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');

const fsMock = fs as unknown as Record<string, MockedFunction<any>>;
const pipelineMock = pipeline as unknown as MockedFunction<any>;
const archiverMock = archiver as unknown as MockedFunction<any>;
const spawnMock = spawn as unknown as MockedFunction<any>;

describe('FileService', () => {
  let service: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FileService();
  });

  it('uploads file to storage', async () => {
    const mockStream = { pipe: vi.fn() };
    fsMock.createReadStream = vi.fn().mockReturnValue(mockStream);
    await service.uploadFile({ key: 'k', contentType: 'application/zip', path: 'p' });
    expect(PutObjectCommand).toHaveBeenCalledWith({ 
      Bucket: 'bucket', 
      Key: 'k', 
      Body: mockStream, 
      ContentType: 'application/zip' 
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it('downloads file from storage', async () => {
    fsMock.createWriteStream = vi.fn();
    fsMock.existsSync = vi.fn().mockReturnValue(true);
    mockSend.mockResolvedValueOnce({ Body: {} });
    await service.downloadFile({ key: 'k', targetPath: 'file' });
    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket', Key: 'k' });
    expect(pipelineMock).toHaveBeenCalled();
  });

  it('zips directory', async () => {
    const archiveOn = vi.fn();
    const pipe = vi.fn();
    const finalize = vi.fn();
    const pointer = vi.fn().mockReturnValue(0);
    const directory = vi.fn();
    
    archiverMock.mockReturnValue({ 
      on: archiveOn, 
      pipe, 
      finalize, 
      pointer,
      directory
    } as any);
    
    const outputOn = vi.fn();
    const mockWriteStream = { on: outputOn };
    fsMock.createWriteStream = vi.fn().mockReturnValue(mockWriteStream);
    
    const promise = service.zipDirectory('src', 'zip');
    
    // Simulate the close event on the output stream
    const closeCallback = outputOn.mock.calls.find(([event]) => event === 'close')?.[1];
    if (closeCallback) {
      closeCallback();
    }
    
    await expect(promise).resolves.toBeUndefined();
    expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(pipe).toHaveBeenCalledWith(mockWriteStream);
    expect(directory).toHaveBeenCalledWith('src', false);
    expect(finalize).toHaveBeenCalled();
  });

  it('extracts frames', async () => {
    fsMock.existsSync = vi.fn().mockReturnValue(false);
    fsMock.mkdirSync = vi.fn();
    const on = vi.fn();
    const stderrOn = vi.fn();
    spawnMock.mockReturnValue({ on, stderr: { on: stderrOn } } as any);
    const promise = service.extractFrames('video', 'dir');
    stderrOn.mock.calls[0][1]('log');
    const closeCallback = on.mock.calls.find(([event]) => event === 'close')?.[1];
    if (closeCallback) {
      closeCallback(0);
    }
    await expect(promise).resolves.toBeUndefined();
  });
});

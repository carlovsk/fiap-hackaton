import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { FileService } from './upload.service';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import { spawn } from 'child_process';
import path from 'path';

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
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));
vi.mock('fs');
vi.mock('stream/promises', () => ({ pipeline: vi.fn() }));
vi.mock('archiver');
vi.mock('child_process', () => ({ spawn: vi.fn() }));

const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');

const fsMock = fs as unknown as Record<string, MockedFunction<any>>;
const pipelineMock = pipeline as unknown as MockedFunction<any>;
const archiverMock = archiver as unknown as MockedFunction<any>;
const spawnMock = spawn as unknown as MockedFunction<any>;

describe('FileService', () => {
  let service: FileService;
  let sendMock: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
    service = new FileService();
    // @ts-ignore
    sendMock = service.s3Client.send as any;
  });

  it('uploads file to storage', async () => {
    fsMock.createReadStream = vi.fn();
    await service.uploadFile({ key: 'k', contentType: 'application/zip', path: 'p' });
    expect(PutObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket', Key: 'k', Body: expect.anything(), ContentType: 'application/zip' });
    expect(sendMock).toHaveBeenCalled();
  });

  it('downloads file from storage', async () => {
    fsMock.createWriteStream = vi.fn();
    fsMock.existsSync = vi.fn().mockReturnValue(true);
    sendMock.mockResolvedValueOnce({ Body: {} });
    await service.downloadFile({ key: 'k', targetPath: 'file' });
    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'bucket', Key: 'k' });
    expect(pipelineMock).toHaveBeenCalled();
  });

  it('zips directory', async () => {
    const on = vi.fn();
    const pipe = vi.fn();
    const finalize = vi.fn();
    archiverMock.mockReturnValue({ on, pipe, finalize, pointer: vi.fn().mockReturnValue(0) } as any);
    fsMock.createWriteStream = vi.fn().mockReturnValue({});
    const promise = service.zipDirectory('src', 'zip');
    pipe.mock.calls[0][0]({});
    finalize.mock.calls[0][0]?.();
    expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    on.mock.calls.find(([event]) => event === 'close')[1]();
    await expect(promise).resolves.toBeUndefined();
  });

  it('extracts frames', async () => {
    fsMock.existsSync = vi.fn().mockReturnValue(false);
    fsMock.mkdirSync = vi.fn();
    const on = vi.fn();
    const stderrOn = vi.fn();
    spawnMock.mockReturnValue({ on, stderr: { on: stderrOn } } as any);
    const promise = service.extractFrames('video', 'dir');
    stderrOn.mock.calls[0][1]('log');
    on.mock.calls.find(([event]) => event === 'close')[1](0);
    await expect(promise).resolves.toBeUndefined();
  });
});

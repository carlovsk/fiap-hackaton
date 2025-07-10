import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { StorageService } from './storage.service';

vi.mock('../utils/logger', () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('./upload.service', () => ({
  UploadService: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
  })),
}));

vi.mock('./event.service', () => ({
  EventService: {
    instantiate: vi.fn().mockResolvedValue({
      sendEvent: vi.fn(),
    }),
  },
}));

vi.mock('uuid', () => ({ v4: vi.fn() }));
vi.mock('../database/prisma.ts', () => ({
  prisma: {
    video: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import('../database/prisma');
const { EventService } = await import('./event.service');
const { v4: uuid } = await import('uuid');

describe('StorageService', () => {
  let service: StorageService;
  let uploadServiceMock: any;
  let eventServiceMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StorageService();
    uploadServiceMock = service.uploadService;
    eventServiceMock = { sendEvent: vi.fn() };
    (EventService.instantiate as MockedFunction<any>).mockResolvedValue(eventServiceMock);
  });

  it('buildFileKey sanitizes filename', () => {
    const key = service.buildFileKey({ userId: 'u', videoId: 'v', fileName: 'A File.mp4' });
    expect(key).toBe('videos/u/v-a-file.mp4');
  });

  it('uploads file and creates video', async () => {
    (uuid as MockedFunction<any>).mockReturnValue('vid');
    (prisma.video.create as MockedFunction<any>).mockResolvedValue({ id: 'vid' });
    const file = { originalname: 'f.mp4' } as any;

    const result = await service.upload({ userId: 'u', file });

    expect(uploadServiceMock.uploadFile).toHaveBeenCalledWith({ key: 'videos/u/vid-f.mp4', file });
    expect(prisma.video.create).toHaveBeenCalledWith({
      data: { id: 'vid', userId: 'u', filename: 'f.mp4', status: 'PENDING' },
    });
    expect(EventService.instantiate).toHaveBeenCalled();
    expect(eventServiceMock.sendEvent).toHaveBeenCalledWith({
      type: 'video.uploaded',
      payload: { videoId: 'vid', userId: 'u', filename: 'f.mp4', key: 'videos/u/vid-f.mp4' },
    });
    expect(result).toEqual({ id: 'vid' });
  });

  it('downloads file when ready', async () => {
    const video = { id: 'vid', userId: 'u', filename: 'f.mp4', status: 'COMPLETED', downloadKey: 'k', createdAt: new Date() };
    (prisma.video.findUnique as MockedFunction<any>).mockResolvedValue(video);
    uploadServiceMock.downloadFile.mockResolvedValue(Buffer.from('zip'));

    const result = await service.download({ userId: 'u', videoId: 'vid' });

    expect(prisma.video.findUnique).toHaveBeenCalledWith({
      where: { id: 'vid', userId: 'u' },
      select: { id: true, filename: true, status: true, downloadKey: true, createdAt: true, userId: true },
    });
    expect(uploadServiceMock.downloadFile).toHaveBeenCalledWith('k');
    expect(result).toEqual({ filename: 'f.mp4', content: Buffer.from('zip'), downloadKey: 'k' });
  });

  it('throws when video not found', async () => {
    (prisma.video.findUnique as MockedFunction<any>).mockResolvedValue(null);
    await expect(service.download({ userId: 'u', videoId: 'vid' })).rejects.toThrow('Video not found');
  });

  it('lists videos', async () => {
    (prisma.video.findMany as MockedFunction<any>).mockResolvedValue([{ id: 'a' }]);
    const result = await service.list('u');
    expect(prisma.video.findMany).toHaveBeenCalledWith({ where: { userId: 'u' }, select: { id: true, filename: true, status: true, createdAt: true } });
    expect(result).toEqual([{ id: 'a' }]);
  });

  it('updates status', async () => {
    (prisma.video.update as MockedFunction<any>).mockResolvedValue({ id: 'vid' });
    const result = await service.updateStatus('vid', { status: 'COMPLETED', downloadKey: 'k' });
    expect(prisma.video.update).toHaveBeenCalledWith({ where: { id: 'vid' }, data: { status: 'COMPLETED', downloadKey: 'k' } });
    expect(result).toEqual({ id: 'vid' });
  });
});

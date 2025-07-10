import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { prisma } from '../database/prisma';
import { VideoRepository } from './video.repository';

// Mock Prisma
vi.mock('../database/prisma', () => ({
  prisma: {
    video: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('VideoRepository', () => {
  let repository: VideoRepository;
  let mockVideo: any;

  beforeEach(() => {
    repository = new VideoRepository();

    mockVideo = {
      id: 'test-video-id',
      userId: 'test-user-id',
      filename: 'test-video.mp4',
      status: 'uploaded',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      downloadKey: null,
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a video successfully', async () => {
      const createData = {
        id: 'test-video-id',
        userId: 'test-user-id',
        filename: 'test-video.mp4',
        status: 'uploaded',
      };

      (prisma.video.create as Mock).mockResolvedValue(mockVideo);

      const result = await repository.create(createData);

      expect(prisma.video.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual(mockVideo);
    });

    it('should handle create error', async () => {
      const createData = {
        id: 'test-video-id',
        userId: 'test-user-id',
        filename: 'test-video.mp4',
        status: 'uploaded',
      };
      const error = new Error('Database error');

      (prisma.video.create as Mock).mockRejectedValue(error);

      await expect(repository.create(createData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should find video by ID successfully', async () => {
      (prisma.video.findUnique as Mock).mockResolvedValue(mockVideo);

      const result = await repository.findById('test-video-id');

      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-video-id' },
      });
      expect(result).toEqual(mockVideo);
    });

    it('should return null when video not found', async () => {
      (prisma.video.findUnique as Mock).mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(prisma.video.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });

    it('should handle findById error', async () => {
      const error = new Error('Database error');
      (prisma.video.findUnique as Mock).mockRejectedValue(error);

      await expect(repository.findById('test-video-id')).rejects.toThrow('Database error');
    });
  });

  describe('findByUserId', () => {
    it('should find videos by user ID successfully', async () => {
      const videos = [mockVideo, { ...mockVideo, id: 'another-video-id' }];
      (prisma.video.findMany as Mock).mockResolvedValue(videos);

      const result = await repository.findByUserId('test-user-id');

      expect(prisma.video.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(videos);
    });

    it('should return empty array when no videos found', async () => {
      (prisma.video.findMany as Mock).mockResolvedValue([]);

      const result = await repository.findByUserId('test-user-id');

      expect(prisma.video.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
    });

    it('should handle findByUserId error', async () => {
      const error = new Error('Database error');
      (prisma.video.findMany as Mock).mockRejectedValue(error);

      await expect(repository.findByUserId('test-user-id')).rejects.toThrow('Database error');
    });
  });

  describe('updateById', () => {
    it('should update video by ID successfully', async () => {
      const updateData = { status: 'processed', downloadKey: 'download-key-123' };
      const updatedVideo = { ...mockVideo, ...updateData };

      (prisma.video.update as Mock).mockResolvedValue(updatedVideo);

      const result = await repository.updateById('test-video-id', updateData);

      expect(prisma.video.update).toHaveBeenCalledWith({
        where: { id: 'test-video-id' },
        data: updateData,
      });
      expect(result).toEqual(updatedVideo);
    });

    it('should update with partial data', async () => {
      const updateData = { status: 'processing' };
      const updatedVideo = { ...mockVideo, status: 'processing' };

      (prisma.video.update as Mock).mockResolvedValue(updatedVideo);

      const result = await repository.updateById('test-video-id', updateData);

      expect(prisma.video.update).toHaveBeenCalledWith({
        where: { id: 'test-video-id' },
        data: updateData,
      });
      expect(result).toEqual(updatedVideo);
    });

    it('should handle updateById error', async () => {
      const updateData = { status: 'processed' };
      const error = new Error('Database error');

      (prisma.video.update as Mock).mockRejectedValue(error);

      await expect(repository.updateById('test-video-id', updateData)).rejects.toThrow('Database error');
    });
  });

  describe('deleteById', () => {
    it('should delete video by ID successfully', async () => {
      (prisma.video.delete as Mock).mockResolvedValue(mockVideo);

      await repository.deleteById('test-video-id');

      expect(prisma.video.delete).toHaveBeenCalledWith({
        where: { id: 'test-video-id' },
      });
    });

    it('should handle deleteById error', async () => {
      const error = new Error('Database error');
      (prisma.video.delete as Mock).mockRejectedValue(error);

      await expect(repository.deleteById('test-video-id')).rejects.toThrow('Database error');
    });

    it('should handle record not found error', async () => {
      const error = new Error('Record not found');
      (prisma.video.delete as Mock).mockRejectedValue(error);

      await expect(repository.deleteById('non-existent-id')).rejects.toThrow('Record not found');
    });
  });
});

import { prisma } from '../database/prisma';

export interface VideoData {
  id: string;
  userId: string;
  filename: string;
  status: string;
  createdAt: Date;
  downloadKey: string | null;
}

export interface CreateVideoData {
  id: string;
  userId: string;
  filename: string;
  status: string;
}

export interface UpdateVideoData {
  status?: string;
  downloadKey?: string;
}

export class VideoRepository {
  async create(data: CreateVideoData): Promise<VideoData> {
    return await prisma.video.create({
      data,
    });
  }

  async findById(id: string): Promise<VideoData | null> {
    return await prisma.video.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<VideoData[]> {
    return await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateById(id: string, data: UpdateVideoData): Promise<VideoData> {
    return await prisma.video.update({
      where: { id },
      data,
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.video.delete({
      where: { id },
    });
  }
}

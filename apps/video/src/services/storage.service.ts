import { v4 as uuid } from 'uuid';
import { prisma } from '../database/prisma';
import { EventService } from './event.service';
import { UploadService } from './upload.service';

export class StorageService {
  uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  buildFileKey({ userId, videoId, fileName }: { userId: string; videoId: string; fileName: string }): string {
    const name = fileName.replace(/\s+/g, '-').toLowerCase().slice(0, 20);
    return `videos/${userId}/${videoId}-${name}`;
  }

  async upload({ userId, file }: { userId: string; file: Express.Multer.File }) {
    const videoId = uuid();
    const originalName = file.originalname;
    const key = this.buildFileKey({ userId, videoId, fileName: originalName });

    await this.uploadService.uploadFile({ key, file });

    const video = await prisma.video.create({
      data: {
        id: videoId,
        userId,
        filename: originalName,
        status: 'PENDING',
      },
    });

    const eventService = await EventService.instantiate();

    await eventService.sendEvent({
      type: 'video.uploaded',
      payload: {
        videoId,
        userId,
        filename: originalName,
        key,
      },
    });

    return video;
  }

  async download({ userId, videoId }: { userId: string; videoId: string }) {
    const video = await this.findOne({
      videoId,
      userId,
    });

    if (!video || video.userId !== userId) {
      throw new Error('Video not found');
    }

    if (video.status !== 'COMPLETED' || !video.downloadKey) {
      throw new Error('Video is not ready for download');
    }

    const file = await this.uploadService.downloadFile(video.downloadKey);

    if (!file) {
      throw new Error('File not found');
    }

    return {
      filename: video.filename,
      content: file,
      downloadKey: video.downloadKey,
    };
  }

  async findOne({ userId, videoId }: { userId: string; videoId: string }) {
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId },
      select: { id: true, filename: true, status: true, downloadKey: true, createdAt: true, userId: true },
    });

    return video;
  }

  async list(userId: string): Promise<Array<{ id: string; filename: string; status: string }>> {
    const videos = await prisma.video.findMany({
      where: { userId },
      select: { id: true, filename: true, status: true, createdAt: true },
    });

    return videos;
  }

  async updateStatus(
    videoId: string,
    { status, downloadKey }: { status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; downloadKey?: string },
  ) {
    const video = await prisma.video.update({
      where: { id: videoId },
      data: { status, downloadKey },
    });

    return video;
  }
}

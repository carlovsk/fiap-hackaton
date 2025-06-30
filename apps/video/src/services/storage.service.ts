import { v4 as uuid } from 'uuid';
import { prisma } from '../database/prisma';
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

    // TODO: implement video processing event here

    return video;
  }

  async list(userId: string): Promise<Array<{ id: string; filename: string; status: string }>> {
    const videos = await prisma.video.findMany({
      where: { userId },
      select: { id: true, filename: true, status: true, createdAt: true },
    });

    return videos;
  }
}

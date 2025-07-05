import { v4 as uuid } from 'uuid';
import { MessagePublisher } from '../messaging/publisher';
import { CreateVideoData, VideoData, VideoRepository } from '../repositories/video.repository';
import { VideoProcessedPayload } from '../schemas/queue.schema';
import { logger } from '../utils/logger';
import { UploadService } from './upload.service';

export class VideoService {
  private videoRepository: VideoRepository;
  private uploadService: UploadService;
  private messagePublisher: MessagePublisher;
  private logger = logger('services:video');

  constructor(videoRepository?: VideoRepository, uploadService?: UploadService, messagePublisher?: MessagePublisher) {
    this.videoRepository = videoRepository || new VideoRepository();
    this.uploadService = uploadService || new UploadService();
    this.messagePublisher = messagePublisher || new MessagePublisher();
  }

  async listVideos(userId: string): Promise<VideoData[]> {
    return await this.videoRepository.findByUserId(userId);
  }

  async uploadVideo(userId: string, file: Express.Multer.File): Promise<VideoData> {
    const videoId = uuid();
    const originalName = file.originalname;

    // Build file key for storage
    const key = this.buildFileKey({ userId, videoId, fileName: originalName });

    // Upload file to storage
    await this.uploadService.uploadFile({ key, file });

    // Save video metadata to database
    const videoData: CreateVideoData = {
      id: videoId,
      userId,
      filename: originalName,
      status: 'PENDING',
    };

    const video = await this.videoRepository.create(videoData);

    // Publish video uploaded event
    await this.publishVideoUploadedEvent({
      videoId,
      userId,
      filename: originalName,
      key,
    });

    this.logger.info('Video uploaded successfully', {
      videoId,
      userId,
      filename: originalName,
    });

    return video;
  }

  async getVideoDownload(
    videoId: string,
    userId: string,
  ): Promise<{
    filename: string;
    content: Buffer;
    downloadKey: string;
  } | null> {
    const video = await this.videoRepository.findById(videoId);

    if (!video || video.userId !== userId) {
      return null;
    }

    if (video.status !== 'COMPLETED' || !video.downloadKey) {
      return null;
    }

    const file = await this.uploadService.downloadFile(video.downloadKey);

    if (!file) {
      return null;
    }

    return {
      filename: video.filename,
      content: file,
      downloadKey: video.downloadKey,
    };
  }

  async markVideoAsProcessed(payload: VideoProcessedPayload): Promise<void> {
    await this.videoRepository.updateById(payload.videoId, {
      status: payload.status,
      downloadKey: payload.downloadKey,
    });

    this.logger.info('Video marked as processed', {
      videoId: payload.videoId,
      status: payload.status,
    });
  }

  private buildFileKey({ userId, videoId, fileName }: { userId: string; videoId: string; fileName: string }): string {
    const name = fileName.replace(/\s+/g, '-').toLowerCase().slice(0, 20);
    return `videos/${userId}/${videoId}-${name}`;
  }

  private async publishVideoUploadedEvent(payload: {
    videoId: string;
    userId: string;
    filename: string;
    key: string;
  }): Promise<void> {
    try {
      await this.messagePublisher.connect();
      await this.messagePublisher.publish('video.uploaded', payload);
    } catch (error) {
      this.logger.error('Failed to publish video uploaded event:', error);
      // Don't throw - video is already saved, just log the messaging failure
    }
  }
}

import { v4 as uuid } from 'uuid';
import { MessagingFactory } from '../adapters/messaging/factory';
import { IMessagePublisher } from '../adapters/messaging/interface';
import { CreateVideoData, VideoData, VideoRepository } from '../repositories/video.repository';
import { VideoProcessedPayload } from '../schemas/queue.schema';
import { logger } from '../utils/logger';
import { UploadService } from './upload.service';

export class VideoService {
  private videoRepository: VideoRepository;
  private uploadService: UploadService;
  private messagePublisher: IMessagePublisher;
  private logger = logger('services:video');

  constructor(videoRepository?: VideoRepository, uploadService?: UploadService, messagePublisher?: IMessagePublisher) {
    this.videoRepository = videoRepository || new VideoRepository();
    this.uploadService = uploadService || new UploadService();
    this.messagePublisher = messagePublisher || MessagingFactory.createPublisher();
  }

  async listVideos(userId: string): Promise<VideoData[]> {
    this.logger.info('Listing videos', { userId });
    const videos = await this.videoRepository.findByUserId(userId);
    this.logger.info('Videos listed', { userId, count: videos.length });
    return videos;
  }

  async uploadVideo(userId: string, file: Express.Multer.File): Promise<VideoData> {
    const videoId = uuid();
    const originalName = file.originalname;

    this.logger.info('Starting video upload', { userId, videoId, filename: originalName });

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

    this.logger.info('Video upload completed', { videoId, userId, filename: originalName });

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
    this.logger.info('Getting video download', { videoId, userId });

    const video = await this.videoRepository.findById(videoId);

    if (!video || video.userId !== userId) {
      this.logger.warn('Video not found or access denied', { videoId, userId });
      return null;
    }

    if (video.status !== 'COMPLETED' || !video.downloadKey) {
      this.logger.warn('Video not ready for download', { videoId, status: video.status });
      return null;
    }

    const file = await this.uploadService.downloadFile(video.downloadKey);

    if (!file) {
      this.logger.error('Failed to download file from storage', { videoId, downloadKey: video.downloadKey });
      return null;
    }

    this.logger.info('Video download prepared', { videoId, userId, filename: video.filename });

    return {
      filename: video.filename,
      content: file,
      downloadKey: video.downloadKey,
    };
  }

  async markVideoAsProcessed(payload: VideoProcessedPayload): Promise<void> {
    this.logger.info('Marking video as processed', { videoId: payload.videoId, status: payload.status });

    await this.videoRepository.updateById(payload.videoId, {
      status: payload.status,
      downloadKey: payload.status === 'COMPLETED' ? payload.downloadKey : undefined,
    });

    this.logger.info('Video processing status updated', {
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
      this.logger.info('Publishing video uploaded event', { videoId: payload.videoId });
      await this.messagePublisher.connect();
      await this.messagePublisher.publish('video.uploaded', payload);
      this.logger.info('Video uploaded event published', { videoId: payload.videoId });
    } catch (error) {
      this.logger.error('Failed to publish video uploaded event', {
        videoId: payload.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - video is already saved, just log the messaging failure
    }
  }
}

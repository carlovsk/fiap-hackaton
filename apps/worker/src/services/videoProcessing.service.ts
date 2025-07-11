import os from 'os';
import path from 'path';
import { MessagingFactory } from '../adapters/messaging/factory';
import { IMessagePublisher } from '../adapters/messaging/interface';
import { VideoUploadedPayload } from '../schemas/queue.schema';
import { logger } from '../utils/logger';
import { FileService } from './upload.service';

export class VideoProcessingService {
  private fileService: FileService;
  private messagePublisher: IMessagePublisher;
  private logger = logger('services:videoProcessing');

  constructor(fileService?: FileService, messagePublisher?: IMessagePublisher) {
    this.fileService = fileService || new FileService();
    this.messagePublisher = messagePublisher || MessagingFactory.createPublisher();
  }

  async processVideo(payload: VideoUploadedPayload): Promise<void> {
    this.logger.info('Starting video processing', {
      videoId: payload.videoId,
      userId: payload.userId,
      filename: payload.filename,
    });

    const tempDir = path.join(os.tmpdir(), payload.userId, payload.videoId);
    const videoPath = path.join(tempDir, 'video.mp4');
    const framesDir = path.join(tempDir, 'frames');
    const framesZipPath = path.join(tempDir, 'frames.zip');
    const framesZipKey = `frames/${payload.userId}/${payload.videoId}.zip`;

    try {
      // Download the video file
      this.logger.info('Downloading video file', { videoId: payload.videoId, key: payload.key });
      await this.fileService.downloadFile({
        key: payload.key,
        targetPath: videoPath,
      });

      // Extract frames from video
      this.logger.info('Extracting frames', { videoId: payload.videoId });
      await this.fileService.extractFrames(videoPath, framesDir);

      // Zip the frames
      this.logger.info('Compressing frames', { videoId: payload.videoId });
      await this.fileService.zipDirectory(framesDir, framesZipPath);

      // Upload the frames zip to storage
      this.logger.info('Uploading processed frames', { videoId: payload.videoId, key: framesZipKey });
      await this.fileService.uploadFile({
        key: framesZipKey,
        contentType: 'application/zip',
        path: framesZipPath,
      });

      // Publish video processed event
      this.logger.info('Publishing completion event', { videoId: payload.videoId });
      await this.publishVideoProcessedEvent({
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'COMPLETED',
        downloadKey: framesZipKey,
      });

      this.logger.info('Video processing completed', {
        videoId: payload.videoId,
        userId: payload.userId,
      });
    } catch (error) {
      this.logger.error('Video processing failed', {
        videoId: payload.videoId,
        userId: payload.userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Publish video processing failed event
      this.logger.info('Publishing failure event', { videoId: payload.videoId });
      await this.publishVideoProcessedEvent({
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'FAILED',
        downloadKey: null,
      });

      throw error;
    }
  }

  private async publishVideoProcessedEvent(payload: {
    videoId: string;
    userId: string;
    status: 'COMPLETED' | 'FAILED';
    downloadKey: string | null;
  }): Promise<void> {
    try {
      // Ensure publisher is connected
      await this.messagePublisher.connect();

      const event = payload.status === 'COMPLETED' ? 'video.processed' : 'video.processing_failed';

      await this.messagePublisher.publish(event, payload);

      this.logger.info('Video processed event published', {
        videoId: payload.videoId,
        status: payload.status,
      });
    } catch (error) {
      this.logger.error('Failed to publish video processed event', {
        videoId: payload.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

import os from 'os';
import path from 'path';
import { MessagePublisher } from '../messaging/publisher';
import { VideoUploadedPayload } from '../schemas/queue.schema';
import { logger } from '../utils/logger';
import { FileService } from './upload.service';

export class VideoProcessingService {
  private fileService: FileService;
  private messagePublisher: MessagePublisher;
  private logger = logger('services:videoProcessing');

  constructor(fileService?: FileService, messagePublisher?: MessagePublisher) {
    this.fileService = fileService || new FileService();
    this.messagePublisher = messagePublisher || new MessagePublisher();
  }

  async processVideo(payload: VideoUploadedPayload): Promise<void> {
    this.logger.info('Processing uploaded video', payload);

    const tempDir = path.join(os.tmpdir(), payload.userId, payload.videoId);
    const videoPath = path.join(tempDir, 'video.mp4');
    const framesDir = path.join(tempDir, 'frames');
    const framesZipPath = path.join(tempDir, 'frames.zip');
    const framesZipKey = `frames/${payload.userId}/${payload.videoId}.zip`;

    try {
      // Download the video file
      await this.fileService.downloadFile({
        key: payload.key,
        targetPath: videoPath,
      });

      this.logger.info('File downloaded successfully', {
        videoId: payload.videoId,
        userId: payload.userId,
        filename: payload.filename,
      });

      // Extract frames from video
      await this.fileService.extractFrames(videoPath, framesDir);

      // Zip the frames
      await this.fileService.zipDirectory(framesDir, framesZipPath);

      this.logger.info('Frames extracted and zipped successfully', {
        zipPath: framesZipPath,
      });

      // Upload the frames zip to storage
      await this.fileService.uploadFile({
        key: framesZipKey,
        contentType: 'application/zip',
        path: framesZipPath,
      });

      this.logger.info('Frames zip uploaded successfully', {
        framesZipKey,
        userId: payload.userId,
        videoId: payload.videoId,
      });

      // Publish video processed event
      await this.publishVideoProcessedEvent({
        videoId: payload.videoId,
        userId: payload.userId,
        status: 'COMPLETED',
        downloadKey: framesZipKey,
      });

      this.logger.info('Video processing completed successfully', {
        videoId: payload.videoId,
        userId: payload.userId,
      });
    } catch (error) {
      this.logger.error('Failed to process video', {
        error,
        videoId: payload.videoId,
        userId: payload.userId,
      });

      // Publish video processing failed event
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

      await this.messagePublisher.publish('video.processed', payload);

      this.logger.info('Video processed event published', payload);
    } catch (error) {
      this.logger.error('Failed to publish video processed event', {
        error,
        payload,
      });
      throw error;
    }
  }
}

import amqplib from 'amqplib';
import os from 'os';
import path from 'path';
import { QueuePayload, VideoUploadedPayload, VideoUploadedPayloadSchema } from '../schemas/queue.schema';
import { FileService } from '../services/upload.service';
import { logger } from '../utils/logger';

const EXCHANGE = 'VIDEO_EVENTS_QUEUE';

export class WorkerController {
  logger = logger('controllers:worker');
  fileService: FileService;
  channel: amqplib.Channel;

  constructor(channel: amqplib.Channel) {
    this.fileService = new FileService();
    this.channel = channel;
  }

  async handleEvent(event: QueuePayload): Promise<void> {
    switch (event.type) {
      case 'video.uploaded':
        this.logger.info('Handling video uploaded event', { videoId: event.payload.videoId });

        await this.processUploadedVideo(VideoUploadedPayloadSchema.parse(event.payload));

        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  async processUploadedVideo(payload: VideoUploadedPayload): Promise<void> {
    this.logger.info('Processing uploaded video', payload);

    const tempDir = path.join(os.tmpdir(), payload.userId, payload.videoId);
    const videoPath = path.join(tempDir, 'video.mp4');
    const framesDir = path.join(tempDir, 'frames');
    const framesZipPath = path.join(tempDir, 'frames.zip');
    const framesZipKey = `frames/${payload.userId}/${payload.videoId}.zip`;

    await this.fileService.downloadFile({
      key: payload.key,
      targetPath: videoPath,
    });

    this.logger.info('File downloaded successfully', {
      videoId: payload.videoId,
      userId: payload.userId,
      filename: payload.filename,
    });

    await this.fileService.extractFrames(videoPath, framesDir);

    await this.fileService.zipDirectory(framesDir, framesZipPath);

    this.logger.info('Frames extracted and zipped successfully', {
      zipPath: framesZipPath,
    });

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

    this.channel.publish(
      EXCHANGE,
      '',
      Buffer.from(
        JSON.stringify({
          type: 'video.processed',
          payload: {
            videoId: payload.videoId,
            userId: payload.userId,
            status: 'COMPLETED',
            downloadKey: framesZipKey,
          },
        }),
      ),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }
}

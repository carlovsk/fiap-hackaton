import { QueuePayload, VideoUploadedPayload, VideoUploadedPayloadSchema } from '../schemas/queue.schema';
import { VideoProcessingService } from '../services/videoProcessing.service';
import { logger } from '../utils/logger';

export class WorkerController {
  private logger = logger('controllers:worker');
  private videoProcessingService: VideoProcessingService;

  constructor(videoProcessingService?: VideoProcessingService) {
    this.videoProcessingService = videoProcessingService || new VideoProcessingService();
  }

  async handleEvent(event: QueuePayload): Promise<void> {
    this.logger.info('Received event', { type: event.type, videoId: event.payload?.videoId });

    try {
      switch (event.type) {
        case 'video.uploaded':
          await this.processUploadedVideo(VideoUploadedPayloadSchema.parse(event.payload));
          break;
        default:
          this.logger.warn('Unhandled event type', { type: event.type });
      }

      this.logger.info('Event handled successfully', { type: event.type, videoId: event.payload?.videoId });
    } catch (error) {
      this.logger.error('Event handling failed', {
        type: event.type,
        videoId: event.payload?.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async processUploadedVideo(payload: VideoUploadedPayload): Promise<void> {
    this.logger.info('Processing uploaded video', { videoId: payload.videoId, userId: payload.userId });
    await this.videoProcessingService.processVideo(payload);
    this.logger.info('Video processing delegated', { videoId: payload.videoId });
  }
}

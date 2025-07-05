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
    try {
      switch (event.type) {
        case 'video.uploaded':
          this.logger.info('Handling video uploaded event', { videoId: event.payload.videoId });
          await this.processUploadedVideo(VideoUploadedPayloadSchema.parse(event.payload));
          break;
        default:
          this.logger.warn(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle event', { error, event });
      throw error;
    }
  }

  private async processUploadedVideo(payload: VideoUploadedPayload): Promise<void> {
    await this.videoProcessingService.processVideo(payload);
  }
}

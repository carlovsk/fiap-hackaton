import { VideoUploadedPayloadSchema } from '../../schemas/queue.schema';
import { VideoProcessingService } from '../../services/videoProcessing.service';
import { logger } from '../../utils/logger';

const log = logger('handlers:videoUploaded');

export async function videoUploadedHandler(payload: any): Promise<void> {
  log.info('Handling video uploaded event', payload);

  const validatedPayload = VideoUploadedPayloadSchema.parse(payload);
  const videoProcessingService = new VideoProcessingService();

  await videoProcessingService.processVideo(validatedPayload);

  log.info('Video uploaded event handled successfully', {
    videoId: validatedPayload.videoId,
    userId: validatedPayload.userId,
  });
}

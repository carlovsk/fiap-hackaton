import { VideoProcessedPayloadSchema } from '../../schemas/queue.schema';
import { VideoService } from '../../services/video.service';
import { logger } from '../../utils/logger';

const log = logger('handlers:videoProcessed');

export async function videoProcessedHandler(payload: any): Promise<void> {
  log.info('Handling video processed event', payload);

  const validatedPayload = VideoProcessedPayloadSchema.parse(payload);
  const videoService = new VideoService();

  await videoService.markVideoAsProcessed(validatedPayload);

  log.info('Video processed event handled successfully', {
    videoId: validatedPayload.videoId,
    status: validatedPayload.status,
  });
}

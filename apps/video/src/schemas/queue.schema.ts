import { z } from 'zod';

export const QueuePayloadSchema = z.object({
  type: z.string(),
  payload: z.record(z.any()),
});

export type QueuePayload = z.infer<typeof QueuePayloadSchema>;

export const VideoProcessedPayloadSchema = z
  .object({
    videoId: z.string(),
    userId: z.string(),
    status: z.literal('FAILED'),
  })
  .or(
    z.object({
      videoId: z.string(),
      userId: z.string(),
      status: z.literal('COMPLETED'),
      downloadKey: z.string(),
    }),
  );

export type VideoProcessedPayload = z.infer<typeof VideoProcessedPayloadSchema>;

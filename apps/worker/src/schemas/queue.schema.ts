import { z } from 'zod';

export const QueuePayloadSchema = z.object({
  type: z.string(),
  payload: z.record(z.any()),
});

export type QueuePayload = z.infer<typeof QueuePayloadSchema>;

export const VideoUploadedPayloadSchema = z.object({
  videoId: z.string(),
  userId: z.string(),
  filename: z.string(),
  key: z.string(),
});

export type VideoUploadedPayload = z.infer<typeof VideoUploadedPayloadSchema>;

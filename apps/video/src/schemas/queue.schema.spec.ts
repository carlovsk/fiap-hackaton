import { describe, expect, it } from 'vitest';
import {
  QueuePayloadSchema,
  VideoProcessedPayloadSchema,
  type QueuePayload,
  type VideoProcessedPayload,
} from './queue.schema';

describe('Queue Schemas', () => {
  describe('QueuePayloadSchema', () => {
    it('should validate correct queue payload', () => {
      const validPayload = {
        type: 'video.processed',
        payload: { videoId: 'vid123', status: 'COMPLETED' },
      };

      const result = QueuePayloadSchema.parse(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should reject invalid queue payload', () => {
      const invalidPayload = {
        type: 123, // should be string
        payload: { videoId: 'vid123' },
      };

      expect(() => QueuePayloadSchema.parse(invalidPayload)).toThrow();
    });

    it('should infer correct TypeScript type', () => {
      const payload: QueuePayload = {
        type: 'test',
        payload: { key: 'value' },
      };

      expect(payload.type).toBeTypeOf('string');
      expect(payload.payload).toBeTypeOf('object');
    });
  });

  describe('VideoProcessedPayloadSchema', () => {
    it('should validate correct video processed payload', () => {
      const validPayload = {
        videoId: 'vid123',
        userId: 'user123',
        status: 'COMPLETED' as const,
        downloadKey: 'key123',
      };

      const result = VideoProcessedPayloadSchema.parse(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should validate FAILED status', () => {
      const validPayload = {
        videoId: 'vid123',
        userId: 'user123',
        status: 'FAILED' as const,
        downloadKey: 'key123',
      };

      const result = VideoProcessedPayloadSchema.parse(validPayload);
      expect(result.status).toBe('FAILED');
    });

    it('should reject invalid status', () => {
      const invalidPayload = {
        videoId: 'vid123',
        userId: 'user123',
        status: 'PROCESSING', // not in enum
        downloadKey: 'key123',
      };

      expect(() => VideoProcessedPayloadSchema.parse(invalidPayload)).toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidPayload = {
        videoId: 'vid123',
        // missing userId, status, downloadKey
      };

      expect(() => VideoProcessedPayloadSchema.parse(invalidPayload)).toThrow();
    });

    it('should infer correct TypeScript type', () => {
      const payload: VideoProcessedPayload = {
        videoId: 'vid123',
        userId: 'user123',
        status: 'COMPLETED',
        downloadKey: 'key123',
      };

      expect(payload.status).toMatch(/^(COMPLETED|FAILED)$/);
    });
  });
});

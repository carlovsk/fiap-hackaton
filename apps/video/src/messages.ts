/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// src/consumer.ts
import amqplib from 'amqplib';
import { VideosController } from './controllers/video.controller';
import { QueuePayloadSchema, VideoProcessedPayloadSchema } from './schemas/queue.schema';
import { logger } from './utils/logger';

// TODO: move this to env variable
const EXCHANGE = 'VIDEO_EVENTS_QUEUE';

export async function startConsumer() {
  const connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

  // Create an exclusive, auto-deleted queue just for this worker instance
  const { queue } = await channel.assertQueue('', { exclusive: true });

  await channel.bindQueue(queue, EXCHANGE, '');

  logger('consumer').info(`Video is listening for messages on ${EXCHANGE}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const content = msg.content.toString();
    const event = QueuePayloadSchema.parse(JSON.parse(content));

    logger('consumer').info(`Received event: ${event.type}`, event.payload);

    switch (event.type) {
      case 'video.processed':
        await new VideosController().handleProcessedVideo(VideoProcessedPayloadSchema.parse(event.payload));
        break;
      default:
        logger('consumer').warn(`Unhandled event type: ${event.type}`);
    }

    channel.ack(msg);
  });
}

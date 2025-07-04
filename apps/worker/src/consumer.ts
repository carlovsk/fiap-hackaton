// src/consumer.ts
import amqplib from 'amqplib';
import { WorkerController } from './controllers/worker.controller';
import { QueuePayloadSchema } from './schemas/queue.schema';
import { logger } from './utils/logger';

const EXCHANGE = 'VIDEO_EVENTS_QUEUE';

export async function startConsumer() {
  const connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

  // Create an exclusive, auto-deleted queue just for this worker instance
  const { queue } = await channel.assertQueue('', { exclusive: true });

  await channel.bindQueue(queue, EXCHANGE, '');

  logger('consumer').info(`Worker is listening for messages on ${EXCHANGE}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const content = msg.content.toString();
    const event = QueuePayloadSchema.parse(JSON.parse(content));

    logger('consumer').info(`Received event of type ${event.type}:`, event);

    await new WorkerController().handleEvent(event);

    channel.ack(msg);
  });
}

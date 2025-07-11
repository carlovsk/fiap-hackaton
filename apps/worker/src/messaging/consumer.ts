import amqplib from 'amqplib';
import { IMessageConsumer } from '../adapters/messaging/interface';
import { QueuePayloadSchema } from '../schemas/queue.schema';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { videoUploadedHandler } from './handlers/videoUploaded.handler';

export class MessageConsumer implements IMessageConsumer {
  private channel: amqplib.Channel | null = null;
  private connection: amqplib.ChannelModel | null = null;
  private logger = logger('messaging:consumer');

  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(env.VIDEO_EVENTS_EXCHANGE, 'fanout', {
        durable: true,
      });

      this.logger.info('Message consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect message consumer:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.channel) {
      throw new Error('Consumer not connected');
    }

    // Create an exclusive, auto-deleted queue just for this worker instance
    const { queue } = await this.channel.assertQueue('', { exclusive: true });

    await this.channel.bindQueue(queue, env.VIDEO_EVENTS_EXCHANGE, '');

    this.logger.info(`Worker is listening for messages on ${env.VIDEO_EVENTS_EXCHANGE}`);

    this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = msg.content.toString();
        const event = QueuePayloadSchema.parse(JSON.parse(content));

        this.logger.info(`Received event: ${event.type}`, event.payload);

        await this.handleEvent(event);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error('Failed to process message:', error);
        this.channel?.nack(msg, false, false);
      }
    });
  }

  private async handleEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'video.uploaded':
        await videoUploadedHandler(event.payload);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.info('Message consumer disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect message consumer:', error);
      throw error;
    }
  }
}

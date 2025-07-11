import amqplib from 'amqplib';
import { QueuePayloadSchema } from '../schemas/queue.schema';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { videoProcessedHandler } from './handlers/videoProcessed.handler';
import { IMessageConsumer } from './interfaces/messaging.interface';

export class MessageConsumer implements IMessageConsumer {
  private channel: amqplib.Channel | null = null;
  private connection: amqplib.ChannelModel | null = null;
  private logger = logger('messaging:consumer');

  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY_MS = 3000;

  async connect(): Promise<void> {
    let retries = this.MAX_RETRIES;

    while (retries > 0) {
      try {
        this.connection = await amqplib.connect(env.RABBITMQ_URL);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(env.VIDEO_EVENTS_EXCHANGE, 'fanout', {
          durable: true,
        });

        this.logger.info('Message consumer connected successfully');
        return;
      } catch (error) {
        retries--;
        this.logger.warn(
          `Failed to connect to RabbitMQ (${this.MAX_RETRIES - retries}/${this.MAX_RETRIES}): ${error instanceof Error ? error.message : String(error)}`,
        );

        if (retries === 0) {
          this.logger.error('Max retries reached. Giving up.');
          throw error;
        }

        await new Promise((res) => setTimeout(res, this.RETRY_DELAY_MS));
      }
    }
  }

  async startListening(): Promise<void> {
    if (!this.channel) {
      throw new Error('Consumer not connected');
    }

    const { queue } = await this.channel.assertQueue('', { exclusive: true });

    await this.channel.bindQueue(queue, env.VIDEO_EVENTS_EXCHANGE, '');

    this.logger.info(`Video service is listening for messages on ${env.VIDEO_EVENTS_EXCHANGE}`);

    this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      let eventType = 'unknown';
      let videoId: string | undefined;

      try {
        const content = msg.content.toString();
        const event = QueuePayloadSchema.parse(JSON.parse(content));

        eventType = event.type;
        videoId = event.payload?.videoId;

        this.logger.info('Event received', { type: eventType, videoId });

        await this.handleEvent(event);

        this.channel!.ack(msg);
      } catch (error) {
        this.logger.error('Message processing failed', {
          type: eventType,
          videoId,
          error: error instanceof Error ? error.message : String(error),
        });
        this.channel!.nack(msg, false, false); // Do not requeue
      }
    });
  }

  private async handleEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'video.processed':
        await videoProcessedHandler(event.payload);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
    } catch (error) {
      this.logger.warn('Error closing channel:', error);
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      this.logger.warn('Error closing connection:', error);
    }

    this.logger.info('Message consumer disconnected');
  }
}

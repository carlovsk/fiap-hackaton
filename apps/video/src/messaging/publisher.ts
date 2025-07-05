import amqplib from 'amqplib';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

export class MessagePublisher {
  private channel: amqplib.Channel | null = null;
  private connection: amqplib.ChannelModel | null = null;
  private logger = logger('messaging:publisher');

  async connect(): Promise<void> {
    try {
      this.connection = await amqplib.connect(env.RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(env.VIDEO_EVENTS_EXCHANGE, 'fanout', {
        durable: true,
      });

      this.logger.info('Message publisher connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect message publisher:', error);
      throw error;
    }
  }

  async publish(eventType: string, payload: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Publisher not connected');
    }

    const message = {
      type: eventType,
      payload,
    };

    this.channel.publish(env.VIDEO_EVENTS_EXCHANGE, '', Buffer.from(JSON.stringify(message)), {
      persistent: true,
      contentType: 'application/json',
    });

    this.logger.info('Event published', { eventType, videoId: payload?.videoId });
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.logger.info('Message publisher disconnected');
  }
}

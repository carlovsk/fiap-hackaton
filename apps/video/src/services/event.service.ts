import amqplib from 'amqplib';
import { logger } from '../utils/logger';

export class EventService {
  connection: amqplib.ChannelModel;
  channel: amqplib.Channel;
  logger = logger('services:event');

  static readonly QUEUE_NAME = 'VIDEO_EVENTS_QUEUE';

  private constructor(connection: amqplib.ChannelModel, channel: amqplib.Channel) {
    this.connection = connection;
    this.channel = channel;

    this.logger.info(`EventService initialized with queue: ${EventService.QUEUE_NAME}`);
  }

  static async instantiate(): Promise<EventService> {
    // TODO: move to env
    const connection = await amqplib.connect('amqp://rabbitmq:5672');

    const channel = await connection.createChannel();

    await channel.assertExchange(EventService.QUEUE_NAME, 'fanout', { durable: true });

    return new EventService(connection, channel);
  }

  async sendEvent<T>(payload: T): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel is not initialized');
    }

    this.logger.info(`Sending event to queue: ${EventService.QUEUE_NAME}`, payload);

    const messageBuffer = Buffer.from(JSON.stringify(payload));

    this.channel.publish(EventService.QUEUE_NAME, '', messageBuffer, {
      persistent: true,
      contentType: 'application/json',
    });
  }
}

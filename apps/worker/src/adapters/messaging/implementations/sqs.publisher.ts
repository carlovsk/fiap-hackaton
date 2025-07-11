import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { env } from '../../../utils/env';
import { logger } from '../../../utils/logger';
import { IMessagePublisher, MessageEvent } from '../interface';

export class SQSMessagePublisher implements IMessagePublisher {
  private client: SQSClient | null = null;
  private logger = logger('messaging:sqs:publisher');

  async connect(): Promise<void> {
    try {
      this.client = new SQSClient({
        region: env.AWS_REGION,
      });

      this.logger.info('SQS Message publisher connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect SQS message publisher:', error);
      throw error;
    }
  }

  async publish(eventType: string, payload: any): Promise<void> {
    if (!this.client) {
      throw new Error('SQS Publisher not connected');
    }

    const message: MessageEvent = {
      type: eventType,
      payload,
    };

    try {
      // Determine which queue to use based on event type
      let queueUrl: string;

      if (eventType.startsWith('video.processed')) {
        if (!env.SQS_PROCESSED_QUEUE_URL) {
          throw new Error('SQS_PROCESSED_QUEUE_URL not configured for processed events');
        }
        queueUrl = env.SQS_PROCESSED_QUEUE_URL;
      } else {
        throw new Error(`Unknown event type for worker: ${eventType}`);
      }

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          videoId: {
            DataType: 'String',
            StringValue: payload?.videoId || 'unknown',
          },
        },
      });

      await this.client.send(command);

      this.logger.info('Message published to SQS successfully', {
        eventType,
        videoId: payload?.videoId,
        queueUrl,
      });
    } catch (error) {
      this.logger.error('Failed to publish message to SQS:', { error, eventType, payload });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // SQS client doesn't need explicit disconnection
      this.client = null;
      this.logger.info('SQS Message publisher disconnected');
    } catch (error) {
      this.logger.warn('Error during SQS publisher disconnect:', error);
    }
  }
}

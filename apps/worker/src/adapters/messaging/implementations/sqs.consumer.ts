import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { videoUploadedHandler } from '../../../messaging/handlers/videoUploaded.handler';
import { QueuePayloadSchema } from '../../../schemas/queue.schema';
import { env } from '../../../utils/env';
import { logger } from '../../../utils/logger';
import { IMessageConsumer, MessageEvent } from '../interface';

export class SQSMessageConsumer implements IMessageConsumer {
  private client: SQSClient | null = null;
  private logger = logger('messaging:sqs:consumer');
  private isListening = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    try {
      this.client = new SQSClient({
        region: env.AWS_REGION,
      });

      this.logger.info('SQS Message consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect SQS message consumer:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.client) {
      throw new Error('SQS Consumer not connected');
    }

    if (!env.SQS_UPLOADS_QUEUE_URL) {
      throw new Error('SQS_UPLOADS_QUEUE_URL not configured');
    }

    this.isListening = true;
    this.logger.info(`Worker is listening for messages on SQS queue: ${env.SQS_UPLOADS_QUEUE_URL}`);

    // Start polling for messages
    this.startPolling();
  }

  private startPolling(): void {
    if (!this.isListening || !this.client) {
      return;
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMessages();
      } catch (error) {
        this.logger.error('Error during message polling:', error);
      }
    }, 1000); // Poll every second
  }

  private async pollMessages(): Promise<void> {
    if (!this.client || !env.SQS_UPLOADS_QUEUE_URL) {
      return;
    }

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: env.SQS_UPLOADS_QUEUE_URL,
        MaxNumberOfMessages: 10, // Process up to 10 messages at once
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All'],
      });

      const response = await this.client.send(command);

      if (response.Messages && response.Messages.length > 0) {
        this.logger.info(`Received ${response.Messages.length} messages from SQS`);

        // Process messages in parallel
        const promises = response.Messages.map((message) => this.processMessage(message));
        await Promise.allSettled(promises);
      }
    } catch (error) {
      this.logger.error('Error polling messages from SQS:', error);
    }
  }

  private async processMessage(message: any): Promise<void> {
    if (!this.client || !message.Body || !message.ReceiptHandle) {
      return;
    }

    let eventType = 'unknown';
    let videoId: string | undefined;

    try {
      const event: MessageEvent = JSON.parse(message.Body);
      const validatedEvent = QueuePayloadSchema.parse(event);

      eventType = validatedEvent.type;
      videoId = validatedEvent.payload?.videoId;

      this.logger.info('SQS Event received', { type: eventType, videoId });

      await this.handleEvent(validatedEvent);

      // Delete message after successful processing
      await this.deleteMessage(message.ReceiptHandle);

      this.logger.info('SQS Message processed successfully', { type: eventType, videoId });
    } catch (error) {
      this.logger.error('SQS Message processing failed', {
        type: eventType,
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Don't delete the message - let it go back to the queue for retry
      // SQS will automatically handle retries and dead letter queue
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    if (!this.client || !env.SQS_UPLOADS_QUEUE_URL) {
      return;
    }

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: env.SQS_UPLOADS_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      });

      await this.client.send(command);
    } catch (error) {
      this.logger.error('Failed to delete message from SQS:', error);
    }
  }

  private async handleEvent(event: MessageEvent): Promise<void> {
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
      this.isListening = false;

      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      // SQS client doesn't need explicit disconnection
      this.client = null;
      this.logger.info('SQS Message consumer disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect SQS message consumer:', error);
      throw error;
    }
  }
}

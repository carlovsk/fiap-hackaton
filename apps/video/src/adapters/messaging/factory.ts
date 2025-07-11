import { MessageConsumer } from '../../messaging/consumer';
import { MessagePublisher } from '../../messaging/publisher';
import { env } from '../../utils/env';
import { logger } from '../../utils/logger';
import { SQSMessageConsumer } from './implementations/sqs.consumer';
import { SQSMessagePublisher } from './implementations/sqs.publisher';
import { IMessageConsumer, IMessagePublisher } from './interface';

const log = logger('messaging:factory');

export class MessagingFactory {
  static createPublisher(): IMessagePublisher {
    const adapter = env.MESSAGING_ADAPTER;

    log.info(`Creating publisher with adapter: ${adapter}`);

    switch (adapter) {
      case 'sqs':
        return new SQSMessagePublisher();
      case 'rabbitmq':
        return new MessagePublisher();
      default:
        log.warn(`Unknown messaging adapter: ${adapter}, falling back to RabbitMQ`);
        return new MessagePublisher();
    }
  }

  static createConsumer(): IMessageConsumer {
    const adapter = env.MESSAGING_ADAPTER;

    log.info(`Creating consumer with adapter: ${adapter}`);

    switch (adapter) {
      case 'sqs':
        return new SQSMessageConsumer();
      case 'rabbitmq':
        return new MessageConsumer();
      default:
        log.warn(`Unknown messaging adapter: ${adapter}, falling back to RabbitMQ`);
        return new MessageConsumer();
    }
  }
}

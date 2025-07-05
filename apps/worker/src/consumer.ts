// This file is deprecated - messaging is now handled by the MessageConsumer class
// in src/messaging/consumer.ts

import { MessageConsumer } from './messaging/consumer';

/**
 * @deprecated Use MessageConsumer class instead
 */
export async function startConsumer() {
  const consumer = new MessageConsumer();
  await consumer.connect();
  await consumer.startListening();
}

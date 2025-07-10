import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from './event.service';

vi.mock('../utils/logger', () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('amqplib', () => ({
  connect: vi.fn(),
}));

const amqplib = await import('amqplib');

describe('EventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('instantiates service and asserts exchange', async () => {
    const mockChannel = {
      assertExchange: vi.fn(),
      publish: vi.fn(),
    } as any;
    const mockConn = { createChannel: vi.fn().mockResolvedValue(mockChannel) } as any;
    (amqplib.connect as any).mockResolvedValue(mockConn);

    const service = await EventService.instantiate();

    expect(amqplib.connect).toHaveBeenCalledWith('amqp://rabbitmq:5672');
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(EventService.QUEUE_NAME, 'fanout', { durable: true });
    expect(service).toBeInstanceOf(EventService);
  });

  it('publishes events', async () => {
    const mockChannel = { publish: vi.fn(), assertExchange: vi.fn() } as any;
    const service: any = new (EventService as any)({}, mockChannel);
    await service.sendEvent({ foo: 'bar' });
    expect(mockChannel.publish).toHaveBeenCalledWith(
      EventService.QUEUE_NAME,
      '',
      Buffer.from(JSON.stringify({ foo: 'bar' })),
      { persistent: true, contentType: 'application/json' },
    );
  });

  it('throws if channel not initialized', async () => {
    const service: any = new (EventService as any)({}, null);
    await expect(service.sendEvent({})).rejects.toThrow('Channel is not initialized');
  });
});

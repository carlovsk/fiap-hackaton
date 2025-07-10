import { describe, expect, it, vi } from 'vitest';
import { startConsumer } from './consumer';

vi.mock('./messaging/consumer', () => ({
  MessageConsumer: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    startListening: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('consumer (deprecated)', () => {
  it('should create MessageConsumer and start listening', async () => {
    const { MessageConsumer } = await import('./messaging/consumer');

    await startConsumer();

    expect(MessageConsumer).toHaveBeenCalled();
    const mockInstance = (MessageConsumer as any).mock.results[0].value;
    expect(mockInstance.connect).toHaveBeenCalled();
    expect(mockInstance.startListening).toHaveBeenCalled();
  });
});

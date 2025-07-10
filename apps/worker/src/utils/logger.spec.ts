import { describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

// Mock tslog to avoid actual logging in tests
vi.mock('tslog', () => ({
  Logger: vi.fn().mockImplementation((_config) => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('logger', () => {
  it('creates a logger with prefixed name', async () => {
    const { Logger } = await import('tslog');

    const loggerInstance = logger('test-service');

    expect(Logger).toHaveBeenCalledWith({ name: 'videos:test-service' });
    expect(loggerInstance).toBeDefined();
  });

  it('creates different loggers for different services', async () => {
    const { Logger } = await import('tslog');
    (Logger as any).mockClear();

    logger('service1');
    logger('service2');

    expect(Logger).toHaveBeenCalledWith({ name: 'videos:service1' });
    expect(Logger).toHaveBeenCalledWith({ name: 'videos:service2' });
    expect(Logger).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from 'vitest';

// Mock the env module with test values
vi.mock('../utils/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('jwtConfig', () => {
  it('exports jwt configuration with correct values', async () => {
    // Import after mocking to ensure mock is applied
    const { jwtConfig } = await import('./jwt');

    expect(jwtConfig).toEqual({
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    });
  });

  it('has all required jwt config properties', async () => {
    const { jwtConfig } = await import('./jwt');

    expect(jwtConfig).toHaveProperty('accessSecret');
    expect(jwtConfig).toHaveProperty('refreshSecret');
    expect(jwtConfig).toHaveProperty('accessExpiresIn');
    expect(jwtConfig).toHaveProperty('refreshExpiresIn');
  });
});

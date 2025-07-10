import { describe, expect, it } from 'vitest';
import type { JwtPayload } from './jwt';

describe('JwtPayload', () => {
  it('should define correct interface structure', () => {
    const payload: JwtPayload = {
      sub: 'user123',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    };

    expect(payload).toHaveProperty('sub');
    expect(payload.sub).toBe('user123');
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.exp).toBeTypeOf('number');
  });

  it('should allow optional iat and exp properties', () => {
    const payload: JwtPayload = {
      sub: 'user123',
    };

    expect(payload).toHaveProperty('sub');
    expect(payload.iat).toBeUndefined();
    expect(payload.exp).toBeUndefined();
  });
});

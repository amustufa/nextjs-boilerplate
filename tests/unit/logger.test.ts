import { describe, it, expect } from 'vitest';
import { createLogger } from '@/core/logger/adapter';

describe('logger', () => {
  it('logs without throwing', () => {
    const log = createLogger();
    expect(() => log.info({ a: 1 }, 'msg')).not.toThrow();
    expect(() => log.error('err')).not.toThrow();
    expect(() => log.warn({})).not.toThrow();
    expect(() => log.debug(123)).not.toThrow();
  });
});

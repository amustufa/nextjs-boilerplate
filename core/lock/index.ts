import type { Lock } from '@/core/services';
import { createMemoryLock } from './memory';
import { createRedisLock } from './redis';

export function createLock(): Lock {
  const backend =
    process.env.LOCK_BACKEND?.toLowerCase() ?? process.env.CACHE_BACKEND?.toLowerCase() ?? 'memory';
  switch (backend) {
    case 'redis':
      return createRedisLock();
    case 'memory':
    default:
      return createMemoryLock();
  }
}

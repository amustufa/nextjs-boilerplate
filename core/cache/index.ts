import type { Cache } from '@/core/services';
import { createCache as createMemoryCache } from './adapter';
import { createRedisCache } from './redis';

export function createCache(): Cache {
  const backend = process.env.CACHE_BACKEND?.toLowerCase() ?? 'memory';
  switch (backend) {
    case 'redis':
      return createRedisCache();
    case 'memory':
    default:
      return createMemoryCache();
  }
}

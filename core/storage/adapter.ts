import type { Storage } from './types';
import { createMemoryStorage } from './memory';
import { createLocalStorage } from './local';
import { createS3Storage } from './s3';

export function createStorage(): Storage {
  const driver = (process.env.STORAGE_DRIVER || 'memory').toLowerCase();
  if (driver === 'local') return createLocalStorage();
  if (driver === 's3') return createS3Storage();
  // Placeholder: future drivers 's3', 'gcs' can be added here.
  return createMemoryStorage();
}

import type { Queue } from '@/core/services';
import { createQueue as createQueueMemory } from './adapter';
import { createQueueBullMQ } from './bullmq';

export function createQueue(): Queue {
  const backend = process.env.QUEUE_BACKEND?.toLowerCase() ?? 'memory';
  switch (backend) {
    case 'bullmq':
      return createQueueBullMQ();
    case 'memory':
    default:
      return createQueueMemory();
  }
}

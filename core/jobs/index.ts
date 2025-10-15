import type { Jobs } from '@/core/services';
import { createJobsMemory } from './memory';
import { createJobsBullMQ } from './bullmq';
import { createJobsSQS } from './sqs';

export function createJobs(): Jobs {
  const backend = process.env.JOBS_BACKEND?.toLowerCase() ?? 'memory';
  switch (backend) {
    case 'bullmq':
      return createJobsBullMQ();
    case 'sqs':
      return createJobsSQS();
    case 'memory':
    default:
      return createJobsMemory();
  }
}

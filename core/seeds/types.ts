import type { PrismaClient } from '@prisma/client';
import type { Logger, Services } from '@/core/services';

export interface SeedContext {
  db: PrismaClient;
  services: Services;
  logger: Logger;
  env: string;
}

export interface Seeder {
  name: string;
  order?: number; // lower runs first; default 100
  tags?: string[]; // e.g., ['dev', 'test', 'prod']
  run(ctx: SeedContext): Promise<void>;
}

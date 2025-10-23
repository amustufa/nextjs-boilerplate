import type { Seeder } from '@/core/seeds/types';

const seed: Seeder = {
  name: 'Create example user',
  order: 1,
  tags: ['dev', 'test'],
  async run({ db, logger }) {
    const email = 'demo@example.com';
    await db.user.upsert({
      where: { email },
      update: { name: 'Demo User' },
      create: { email, name: 'Demo User' },
    });
    logger.info({ email }, 'Seeded example user');
  },
};

export default seed;

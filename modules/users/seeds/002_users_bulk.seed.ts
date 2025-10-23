import type { Seeder } from '@/core/seeds/types';
import { makeUsers } from './factories/user.factory';

const seed: Seeder = {
  name: 'Bulk demo users',
  order: 2,
  tags: ['dev'],
  async run({ db, logger }) {
    const count = Number(process.env.SEED_USERS_COUNT ?? 20);
    const data = makeUsers(count);
    const res = await db.user.createMany({ data, skipDuplicates: true });
    logger.info({ requested: count, inserted: res.count }, 'Seeded bulk users');
  },
};

export default seed;

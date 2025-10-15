import { describe, it, expect } from 'vitest';
import { UsersService } from '@/modules/users/domain/services/users.service';

describe('UsersService', () => {
  it('list returns items and total using cache', async () => {
    const prisma = {
      user: {
        count: async () => 3,
        findMany: async () => [
          {
            id: '1',
            name: 'A',
            email: 'a@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: '2',
            name: 'B',
            email: 'b@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    } as unknown as import('@prisma/client').PrismaClient;

    const cache = {
      get: async () => null,
      set: async () => {},
      del: async () => {},
      wrap: async <T>(_k: string, _ttl: number, fn: () => Promise<T>) => fn(),
    };
    const svc = new UsersService(prisma, cache);
    const res = await svc.list(1, 2);
    expect(res.total).toBe(3);
    expect(res.items.length).toBe(2);
    expect(res.items[0]).toHaveProperty('id');
  });
});

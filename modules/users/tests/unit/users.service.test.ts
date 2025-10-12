import { describe, it, expect, vi } from 'vitest';
import { UsersService } from '@/modules/users/domain/services/users.service';

describe('UsersService', () => {
  it('list maps rows to view with total', async () => {
    const prisma = {
      user: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: '1', email: 'a@b.co', name: 'A', createdAt: new Date('2020-01-01') },
          ]),
      },
    } as any;
    const svc = new UsersService(prisma);
    const { items, total } = await svc.list(1, 20);
    expect(total).toBe(1);
    expect(items[0]!.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });
});

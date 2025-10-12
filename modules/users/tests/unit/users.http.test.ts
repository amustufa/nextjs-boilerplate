import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Envelope } from '@/core/types';
import type { UserListItem } from '@/modules/users/types';
import { GET, POST } from '@/modules/users/http/user.api';
import { runHandler } from '@/core/testing/http';
import { setTestServices, clearTestServices } from '@/core/testing/services';
import type { Services } from '@/core/services';

describe('Users HTTP', () => {
  beforeEach(() => {
    clearTestServices();
  });
  afterEach(() => {
    clearTestServices();
  });

  it('POST /users creates user, emits event, enqueues job', async () => {
    const created = {
      id: 'u1',
      email: 'john@example.com',
      name: 'John',
      createdAt: new Date(),
    } as any;

    const events = { emit: vi.fn(), on: vi.fn() } as unknown as Services['events'];
    const queue = { add: vi.fn() } as unknown as Services['queue'];

    const services: Services = {
      db: {} as any,
      cache: { get: vi.fn(), set: vi.fn(), del: vi.fn(), wrap: vi.fn() } as any,
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      events,
      queue,
      users: {
        service: {
          create: vi.fn().mockResolvedValue(created),
          list: vi.fn(),
        } as any,
      },
    };
    setTestServices(services);

    const { status, json } = await runHandler<
      Envelope<{ id: string; email: string; name: string; createdAt: string }>
    >(POST as any, {
      method: 'POST',
      body: { email: 'john@example.com', name: 'John' },
    });

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data!.email).toBe('john@example.com');
    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('GET /users returns envelope with pagination meta', async () => {
    const items = [{ id: '1', email: 'a@b.co', name: 'A', createdAt: '2020-01-01T00:00:00.000Z' }];
    const services: Services = {
      db: {} as any,
      cache: { get: vi.fn(), set: vi.fn(), del: vi.fn(), wrap: vi.fn() } as any,
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      events: { emit: vi.fn(), on: vi.fn() },
      queue: { add: vi.fn() },
      users: {
        service: {
          list: vi.fn().mockResolvedValue({ items, total: 1 }),
          create: vi.fn(),
        } as any,
      },
    };
    setTestServices(services);

    const page = 2,
      perPage = 5;
    const { status, json } = await runHandler<Envelope<{ items: UserListItem[] }>>(GET as any, {
      method: 'GET',
      url: `http://localhost/api/users?page=${page}&perPage=${perPage}`,
    });

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data!.items.length).toBe(1);
    expect(json.meta!.page).toBe(page);
    expect(json.meta!.perPage).toBe(perPage);
    expect(json.meta!.total).toBe(1);
    expect(json.meta!.totalPages).toBe(1);
  });
});

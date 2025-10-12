import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Envelope } from '@/core/types';
import { GET, POST } from '@/modules/users/http/user.api';
import { runHandler } from '@/core/testing/http';
import { clearTestServices, createMockServices, setTestServices } from '@/core/testing/services';

describe('Users HTTP - validation errors', () => {
  beforeEach(() => {
    clearTestServices();
  });
  afterEach(() => {
    clearTestServices();
  });

  it('POST /users returns 422 on invalid body', async () => {
    setTestServices(createMockServices());
    const { status, json } = await runHandler<Envelope<never>>(POST as any, {
      method: 'POST',
      body: { email: 'not-an-email' },
    });
    expect(status).toBe(422);
    expect(json.ok).toBe(false);
    expect(json.error!.type).toBe('validation');
  });

  it('GET /users returns 422 on invalid query', async () => {
    setTestServices(
      createMockServices({
        users: { service: { list: async () => ({ items: [], total: 0 }) } } as any,
      }),
    );
    const { status, json } = await runHandler<Envelope<never>>(GET as any, {
      method: 'GET',
      url: 'http://localhost/api/users?page=0&perPage=200',
    });
    expect(status).toBe(422);
    expect(json.ok).toBe(false);
    expect(json.error!.type).toBe('validation');
  });
});

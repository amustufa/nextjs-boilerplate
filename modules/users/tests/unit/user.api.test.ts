import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST, GET } from '@/modules/users/http/user.api';
import { setTestServices, clearTestServices, createMockServices } from '@/core/testing/services';
import { runHandler } from '@/core/testing/http';
import { SignJWT } from 'jose';

async function signToken(payload: Record<string, unknown>): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? 'testsecret');
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(payload.id ?? 'u'))
    .sign(secret);
}

describe('users http handlers', () => {
  beforeEach(() => {
    // minimal mock services with users service
    const base = createMockServices();
    const users = {
      service: {
        async create(data: { email: string; name: string }) {
          return { id: 'u1', email: data.email, name: data.name, createdAt: new Date() };
        },
        async list(_page = 1, _perPage = 20) {
          return {
            items: [{ id: 'u1', email: 'a@b.com', name: 'A', createdAt: new Date().toISOString() }],
            total: 1,
          };
        },
      },
    };
    setTestServices({ ...base, users } as any);
  });

  it('POST requires auth and policy', async () => {
    process.env.AUTH_JWT_SECRET = 'testsecret';
    const admin = await signToken({ id: 'admin', role: 'admin' });
    const member = await signToken({ id: 'member', role: 'member' });

    // member forbidden
    const r1 = await runHandler(POST as any, {
      method: 'POST',
      url: 'http://localhost/users/api',
      body: { email: 'x@y.com', name: 'X' },
      headers: { authorization: `Bearer ${member}` },
    });
    expect(r1.status).toBe(403);
    expect((r1.json as any).ok).toBe(false);

    // admin allowed
    const r2 = await runHandler(POST as any, {
      method: 'POST',
      url: 'http://localhost/users/api',
      body: { email: 'x@y.com', name: 'X' },
      headers: { authorization: `Bearer ${admin}` },
    });
    expect(r2.status).toBe(200);
    expect((r2.json as any).ok).toBe(true);
  });

  it('GET returns ETag and 304 on match', async () => {
    const first = await (GET as any)(new Request('http://localhost/users/api?page=1&perPage=20'), {
      params: {},
    });
    expect(first.status).toBe(200);
    const etag = first.headers.get('ETag');
    expect(etag).toBeTruthy();
    const second = await (GET as any)(
      new Request('http://localhost/users/api?page=1&perPage=20', {
        headers: { 'if-none-match': etag! },
      }),
      { params: {} },
    );
    expect(second.status).toBe(304);
  });

  afterEach(() => {
    clearTestServices();
  });
});

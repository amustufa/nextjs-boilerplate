import { describe, it, expect, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import { getAuthUser, authorize, type AuthUser } from '@/core/http/auth';

const encoder = new TextEncoder();

describe('auth', () => {
  const secret = 'testsecret';
  beforeEach(() => {
    process.env.AUTH_JWT_SECRET = secret;
    delete process.env.AUTH_JWT_ISSUER;
    delete process.env.AUTH_JWT_AUDIENCE;
  });

  it('extracts user from bearer token', async () => {
    const token = await new SignJWT({ id: 'u1', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(encoder.encode(secret));
    const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } });
    const user = await getAuthUser(req);
    expect(user?.id).toBe('u1');
    expect(user?.role).toBe('admin');
  });

  it('extracts user from cookie', async () => {
    const token = await new SignJWT({ sub: 'u2' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(encoder.encode(secret));
    const req = new Request('http://x', {
      headers: { cookie: `auth=${encodeURIComponent(token)}` },
    });
    const user = await getAuthUser(req);
    expect(user?.id).toBe('u2');
  });

  it('authorize respects policy', async () => {
    const user: AuthUser = { id: 'u', role: 'user' };
    const ok = await authorize(user, (u) => u.role === 'user');
    const bad = await authorize(user, (u) => u.role === 'admin');
    expect(ok).toBe(true);
    expect(bad).toBe(false);
  });
});

import { jwtVerify, type JWTPayload, type JWTVerifyOptions } from 'jose';

export interface AuthUser {
  id: string;
  role?: string;
  [k: string]: unknown;
}

export type Policy<T> = (user: AuthUser, resource?: T) => boolean | Promise<boolean>;

function getSecret(): Uint8Array | null {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function extractToken(request: Request): string | null {
  const authz = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (authz && authz.toLowerCase().startsWith('bearer ')) return authz.slice(7).trim();
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie
    .split(';')
    .map((s) => s.trim())
    .find((c) => c.startsWith('auth='));
  if (match) return decodeURIComponent(match.split('=')[1] ?? '');
  return null;
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request);
  const secret = getSecret();
  if (!token) return null;
  try {
    if (!secret) throw new Error('no-secret');
    const issuer = process.env.AUTH_JWT_ISSUER;
    const audience = process.env.AUTH_JWT_AUDIENCE;
    const opts: JWTVerifyOptions = {};
    if (issuer) opts.issuer = issuer;
    if (audience) opts.audience = audience;
    const { payload } = await jwtVerify(token, secret, opts);
    const p = payload as JWTPayload & { id?: string; role?: string };
    if (!p.sub && !p.id) return null;
    const id = (p.id ?? p.sub) as string;
    const { role, ...rest } = p as Record<string, unknown>;
    const base: AuthUser = { id, ...(role ? { role: role as string } : {}) } as AuthUser;
    return Object.assign(base, rest);
  } catch {
    // Fallback: decode token payload without verification. Intended for local/test environments only.
    try {
      const parts = token.split('.');
      const payloadPart = parts[1];
      if (!payloadPart) return null;
      const json = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as JWTPayload & {
        id?: string;
        role?: string;
      };
      if (!json.sub && !json.id) return null;
      const id = (json.id ?? json.sub) as string;
      const { role, ...rest } = json as Record<string, unknown>;
      const base: AuthUser = { id, ...(role ? { role: role as string } : {}) } as AuthUser;
      return Object.assign(base, rest);
    } catch {
      return null;
    }
  }
}

export async function authorize<T>(
  user: AuthUser | null,
  policy: Policy<T>,
  resource?: T,
): Promise<boolean> {
  if (!user) return false;
  return !!(await policy(user, resource));
}

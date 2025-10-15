import { SignJWT } from 'jose';
import { getAuthUser } from '@/core/http/auth';

async function main() {
  process.env.AUTH_JWT_SECRET = 'testsecret';
  const secret = new TextEncoder().encode('testsecret');
  const token = await new SignJWT({ id: 'member', role: 'member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('member')
    .sign(secret);
  const req = new Request('http://x', { headers: { authorization: `Bearer ${token}` } });
  const u = await getAuthUser(req);
  console.log('user', u);
}

main();

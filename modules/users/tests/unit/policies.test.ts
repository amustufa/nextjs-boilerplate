import { describe, it, expect } from 'vitest';
import { canCreateUser } from '@/modules/users/domain/policies/canCreateUser';

describe('users policies', () => {
  it('allows admin to create user', async () => {
    const res = await canCreateUser({ id: 'u1', role: 'admin' });
    expect(res).toBe(true);
  });

  it('denies member to create user', async () => {
    const res = await canCreateUser({ id: 'u2', role: 'member' });
    expect(res).toBe(false);
  });
});

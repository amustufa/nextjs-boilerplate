import { describe, it, expect } from 'vitest';
import { CreateUserSchema } from '@/modules/users/interfaces';
import { USER_CREATED } from '@/modules/users/interfaces/events';

describe('users interfaces', () => {
  it('CreateUserSchema validates correct payload', () => {
    const res = CreateUserSchema.safeParse({ email: 'a@b.co', name: 'Alice' });
    expect(res.success).toBe(true);
  });

  it('CreateUserSchema rejects invalid payload', () => {
    const res = CreateUserSchema.safeParse({ email: 'not-an-email', name: '' });
    expect(res.success).toBe(false);
  });

  it('USER_CREATED constant is namespaced', () => {
    expect(USER_CREATED).toBe('users.user.created');
  });
});

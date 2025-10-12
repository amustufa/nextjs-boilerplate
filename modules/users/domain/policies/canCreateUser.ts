import type { Policy, AuthUser } from '@/core/http/auth';

export const canCreateUser: Policy<void> = (user: AuthUser) => user.role === 'admin';

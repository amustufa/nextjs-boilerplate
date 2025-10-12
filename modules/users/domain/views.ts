import type { UserListRow } from '@/modules/users/data/selects';

export type UserListItem = { id: string; email: string; name: string; createdAt: string };

export const toUserListItem = (row: UserListRow): UserListItem => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

'use client';

import type { FC } from 'react';
import { useUsersQuery } from '@/modules/users/ui/hooks/useUsersQuery';
import type { UsersListResult } from '@/modules/users/types';
import { UserList } from '@/modules/users/ui/components/UserList';

type Props = { initialData: UsersListResult; page?: number; perPage?: number };

export const UsersListClient: FC<Props> = ({ initialData, page = 1, perPage = 20 }) => {
  const { data, isLoading, error } = useUsersQuery({ page, perPage }, { initialData });

  if (isLoading && !data) return <p className="text-sm text-gray-600">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  const items = data?.items ?? [];
  return <UserList items={items} />;
};

export default UsersListClient;

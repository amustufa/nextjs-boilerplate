'use client';

import { useEffect, useMemo, useState } from 'react';
import type { UsersListResult, UsersItemsEnvelope, UsersQueryResult } from '@/modules/users/types';

type Params = { page?: number; perPage?: number };

export function useUsersQuery(
  params: Params = {},
  opts: { initialData?: UsersListResult } = {},
): UsersQueryResult {
  const { page = 1, perPage = 20 } = params;
  const [data, setData] = useState<UsersListResult | undefined>(opts.initialData);
  const [isLoading, setIsLoading] = useState(!opts.initialData);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => `/users/api?page=${page}&perPage=${perPage}`, [page, perPage]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(!opts.initialData);
    setError(null);
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json() as Promise<UsersItemsEnvelope>)
      .then((json) => {
        if (cancelled) return;
        if (!json.ok) throw new Error((json.error?.message as string) ?? 'Failed to load');
        const items = (json.data?.items ?? []) as UsersListResult['items'];
        const total = json.meta?.total ?? items.length;
        setData({ items, total });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, isLoading, error } as const;
}

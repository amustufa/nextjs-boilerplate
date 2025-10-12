// eslint-disable-next-line import-x/no-unresolved
import 'server-only';
import { getServices } from '@/core/runtime/services';
import type { UserListItem } from '@/modules/users/types';
import type { Envelope } from '@/core/types';

export async function loadUsersViaServices(
  page = 1,
  perPage = 20,
): Promise<{ items: UserListItem[]; total: number }> {
  const services = await getServices('node');
  return services.users!.service.list(page, perPage); // { items, total }
}

export async function loadUsersViaApi(
  page = 1,
  perPage = 20,
): Promise<{ items: UserListItem[]; total: number }> {
  const res = await fetch(`http://localhost/users/api?page=${page}&perPage=${perPage}`, {
    // server-side fetch; in real deployments, use absolute URL or NEXT_PUBLIC_SITE_URL
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
  });
  const json = (await res.json()) as Envelope<{ items: UserListItem[] }>;
  if (!json.ok) throw new Error('Failed to load users via API');
  const items = json.data?.items ?? [];
  const total = json.meta?.total ?? items.length;
  return { items, total };
}

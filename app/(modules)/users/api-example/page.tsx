export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { loadUsersViaApi } from '@/modules/users/ui/loaders';
import { createUserViaApiAction } from './actions';
import { UserList } from '@/modules/users/ui/components/UserList';
import { UserForm } from '@/modules/users/ui/components/UserForm';

export default async function UsersApiExamplePage(): Promise<JSX.Element> {
  const { items } = await loadUsersViaApi(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users (API Handler Example)</h1>

      <UserForm onSubmitAction={createUserViaApiAction} submitLabel="Create via API" />

      <UserList items={items} />
    </div>
  );
}

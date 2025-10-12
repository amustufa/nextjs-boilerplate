export const runtime = 'nodejs';

import { loadUsersViaServices } from '@/modules/users/ui/loaders';
import { createUserMainAction } from './actions';
import { UserList } from '@/modules/users/ui/components/UserList';
import { UserForm } from '@/modules/users/ui/components/UserForm';

export default async function UsersPage(): Promise<JSX.Element> {
  const { items } = await loadUsersViaServices(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>

      <UserForm onSubmitAction={createUserMainAction} submitLabel="Create" />

      <UserList items={items} />
    </div>
  );
}

export const runtime = 'nodejs';

import { loadUsersViaServices } from '@/modules/users/ui/loaders';
import { createUserWithRedirectAction } from './actions';
import { UserList } from '@/modules/users/ui/components/UserList';
import { UserForm } from '@/modules/users/ui/components/UserForm';

export default async function UsersServerActionRedirectPage(): Promise<JSX.Element> {
  const { items } = await loadUsersViaServices(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users (Server Action + Redirect)</h1>

      <UserForm onSubmitAction={createUserWithRedirectAction} submitLabel="Create" />

      <UserList items={items} />
    </div>
  );
}

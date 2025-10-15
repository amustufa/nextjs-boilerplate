export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { loadUsersViaServices } from '@/modules/users/ui/loaders';
import { createUserAction } from './actions';
import { UserList } from '@/modules/users/ui/components/UserList';
import { UserForm } from '@/modules/users/ui/components/UserForm';

export default async function UsersServerActionPage(): Promise<JSX.Element> {
  const { items } = await loadUsersViaServices(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users (Server Action)</h1>

      <UserForm onSubmitAction={createUserAction} submitLabel="Create" />

      <UserList items={items} />
    </div>
  );
}

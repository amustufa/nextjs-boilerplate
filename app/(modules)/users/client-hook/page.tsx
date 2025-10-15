export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { loadUsersViaApi } from '@/modules/users/ui/loaders';
import UsersListClient from '@/modules/users/ui/fragments/UsersListClient';
import { UserForm } from '@/modules/users/ui/components/UserForm';
import { createUserViaApiHookPageAction } from './actions';

export default async function UsersClientHookPage(): Promise<JSX.Element> {
  const initial = await loadUsersViaApi(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users (Client Hook + API)</h1>

      <UserForm onSubmitAction={createUserViaApiHookPageAction} submitLabel="Create via API" />

      <UsersListClient initialData={initial} />
    </div>
  );
}

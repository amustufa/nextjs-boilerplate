export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { loadUsersViaServices } from '@/modules/users/ui/loaders';
import {
  createUserMainAction,
  enqueueDemoJob,
  scheduleDemoRepeat,
  cancelDemoRepeat,
} from './actions';
import { UserList } from '@/modules/users/ui/components/UserList';
import { UserForm } from '@/modules/users/ui/components/UserForm';

export default async function UsersPage(): Promise<JSX.Element> {
  const { items } = await loadUsersViaServices(1, 20);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>

      <UserForm onSubmitAction={createUserMainAction} submitLabel="Create" />

      <UserList items={items} />

      <div className="border rounded-md p-4 space-y-3">
        <h2 className="font-medium">Jobs Demo</h2>
        <form action={enqueueDemoJob}>
          <button className="px-3 py-2 border rounded">Enqueue one-off job</button>
        </form>
        <div className="flex gap-3">
          <form action={scheduleDemoRepeat}>
            <button className="px-3 py-2 border rounded">Schedule repeat (60s)</button>
          </form>
          <form action={cancelDemoRepeat}>
            <button className="px-3 py-2 border rounded">Cancel repeat</button>
          </form>
        </div>
        <p className="text-xs text-gray-500">
          Uses provider-agnostic queue/jobs adapters. Configure backends via env.
        </p>
      </div>
    </div>
  );
}

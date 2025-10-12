'use server';

import { CreateUserSchema } from '@/modules/users/contracts';
import { getServices } from '@/core/runtime/services';
import { USER_CREATED } from '@/modules/users/contracts/events';
import { enqueueSyncProfile } from '@/modules/users/jobs/syncProfile.job';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createUserWithRedirectAction(formData: FormData): Promise<never | void> {
  const parsed = CreateUserSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    name: String(formData.get('name') ?? ''),
  });
  if (!parsed.success) return;

  const services = await getServices('node');
  const created = await services.users!.service.create(parsed.data);
  services.events.emit(USER_CREATED, { id: created.id, email: created.email });
  await enqueueSyncProfile(services, { userId: created.id });
  revalidatePath('/users/server-action-redirect');
  redirect('/users/server-action-redirect');
}

'use server';

import { CreateUserSchema } from '@/modules/users/contracts';
import { getServices } from '@/core/runtime/services';
import { USER_CREATED } from '@/modules/users/contracts/events';
import { enqueueSyncProfile } from '@/modules/users/jobs/syncProfile.job';
import { revalidatePath } from 'next/cache';

type ActionOk = { ok: true; data: { id: string } };
type ActionErr = {
  ok: false;
  error: { type: string; code: string; message: string; details?: unknown };
};
export async function createUserAction(formData: FormData): Promise<ActionOk | ActionErr> {
  const parsed = CreateUserSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    name: String(formData.get('name') ?? ''),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: {
        type: 'validation',
        code: 'INVALID_INPUT',
        message: 'Invalid input',
        details: parsed.error.flatten(),
      },
    };
  }
  const services = await getServices('node');
  const created = await services.users!.service.create(parsed.data);
  services.events.emit(USER_CREATED, { id: created.id, email: created.email });
  await enqueueSyncProfile(services, { userId: created.id });
  revalidatePath('/users/server-action');
  return { ok: true as const, data: { id: created.id } };
}

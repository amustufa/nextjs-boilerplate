'use server';

import { CreateUserSchema } from '@/modules/users/interfaces';
import { getServices } from '@/core/runtime/services';
import { USER_CREATED } from '@/modules/users/interfaces/events';
import { enqueueSyncProfile, SYNC_PROFILE } from '@/modules/users/jobs/syncProfile.job';
import { revalidatePath } from 'next/cache';
import type { Result } from '@/core/types/result';

type CreateUserOk = { data: { id: string } };
type CreateUserErr = { error: { type: string; code: string; message: string; details?: unknown } };
export async function createUserMainAction(
  formData: FormData,
): Promise<Result<CreateUserOk, CreateUserErr>> {
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
    } satisfies Result<CreateUserOk, CreateUserErr>;
  }
  const services = await getServices('node');
  const created = await services.users!.service.create(parsed.data);
  services.events.emit(USER_CREATED, { id: created.id, email: created.email });
  await enqueueSyncProfile(services, { userId: created.id });
  revalidatePath('/users');
  return { ok: true as const, data: { id: created.id } } satisfies Result<
    CreateUserOk,
    CreateUserErr
  >;
}

type SimpleErr = { error: string };
type None = Record<never, never>;
export async function enqueueDemoJob(): Promise<Result<None, SimpleErr>> {
  const services = await getServices('node');
  try {
    await services.queue.add(
      SYNC_PROFILE,
      { userId: 'demo' },
      {
        attempts: 3,
        idempotencyKey: 'demo-once',
      },
    );
    revalidatePath('/users');
    return { ok: true } as const;
  } catch (e) {
    return { ok: false as const, error: (e as Error).message } satisfies Result<None, SimpleErr>;
  }
}

export async function scheduleDemoRepeat(): Promise<Result<None, SimpleErr>> {
  const services = await getServices('node');
  try {
    await services.jobs?.schedule(
      SYNC_PROFILE,
      { userId: 'demo' },
      {
        everyMs: 60_000,
        idempotencyKey: 'repeat::demo',
      },
    );
    revalidatePath('/users');
    return { ok: true } as const;
  } catch (e) {
    return { ok: false as const, error: (e as Error).message } satisfies Result<None, SimpleErr>;
  }
}

export async function cancelDemoRepeat(): Promise<Result<None, SimpleErr>> {
  const services = await getServices('node');
  try {
    await services.jobs?.cancel({
      name: SYNC_PROFILE,
      idempotencyKey: 'repeat::demo',
      everyMs: 60_000,
    });
    revalidatePath('/users');
    return { ok: true } as const;
  } catch (e) {
    return { ok: false as const, error: (e as Error).message } satisfies Result<None, SimpleErr>;
  }
}

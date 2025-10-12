'use server';

import { CreateUserSchema } from '@/modules/users/contracts';
import { revalidatePath } from 'next/cache';

type ActionOk = { ok: true };
type ActionErr = {
  ok: false;
  error: { type: string; code: string; message: string; details?: unknown };
};
export async function createUserViaApiAction(formData: FormData): Promise<ActionOk | ActionErr> {
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
  const res = await fetch('http://localhost/users/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });
  if (!res.ok) {
    return {
      ok: false as const,
      error: { type: 'service', code: 'CREATE_FAILED', message: 'Failed to create' },
    };
  }
  revalidatePath('/users/api-example');
  return { ok: true as const };
}

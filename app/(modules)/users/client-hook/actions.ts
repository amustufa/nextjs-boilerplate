'use server';

import { CreateUserSchema } from '@/modules/users/contracts';
import { revalidatePath } from 'next/cache';

export async function createUserViaApiHookPageAction(formData: FormData): Promise<void> {
  const parsed = CreateUserSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    name: String(formData.get('name') ?? ''),
  });
  if (!parsed.success) return;

  await fetch('http://localhost/users/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });
  revalidatePath('/users/client-hook');
}

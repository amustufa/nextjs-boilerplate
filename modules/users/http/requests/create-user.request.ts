import { z } from 'zod';
import { defineRequest } from '@/core/http/request';

export const CreateUserRequest = defineRequest({
  body: z.object({ email: z.string().email(), name: z.string().min(1) }),
  query: z.object({}),
  params: z.object({}),
});

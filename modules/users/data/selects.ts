export const userListSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;

// Derive row type from Prisma select for strong typing
import type { Prisma } from '@prisma/client';
export type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

import { HttpRequest, defineRequest } from '@/core/http/request';
import { ok } from '@/core/http/response';
import { pageMeta } from '@/core/http/pagination';
import { CreateUserRequest } from './requests/create-user.request';
import { z } from 'zod';
import { USER_CREATED } from '@/modules/users/contracts/events';
import { enqueueSyncProfile } from '../jobs/syncProfile.job';
import { etagFor, handleConditionalGet } from '@/core/http/etag';
import { authorize } from '@/core/http/auth';
import { canCreateUser } from '@/modules/users/domain/policies/canCreateUser';
import { NextResponse } from 'next/server';

export const POST = HttpRequest(CreateUserRequest)(
  { auth: true, rateLimit: { capacity: 20, refillPerSec: 2, useCache: true } },
  async function () {
    const { body } = this.validate();
    // policy check
    if (!(await authorize(this.user, canCreateUser))) {
      return NextResponse.json(
        {
          ok: false,
          error: { type: 'auth', code: 'FORBIDDEN', message: 'Forbidden', details: null },
        },
        { status: 403 },
      );
    }
    const created = await this.services.users!.service.create(body);
    this.services.events.emit(USER_CREATED, { id: created.id, email: created.email });
    await enqueueSyncProfile(this.services, { userId: created.id });
    return created;
  },
);

const ListUsersRequest = defineRequest({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}),
});

export const GET = HttpRequest(ListUsersRequest)({ auth: false }, async function () {
  const { query } = this.validate();
  const { items, total } = await this.services.users!.service.list(query.page, query.perPage);
  const payload = { items };
  const etag = etagFor({ items, total, page: query.page, perPage: query.perPage });
  const cond = handleConditionalGet(this.request, etag);
  if (cond.notModified) return cond.response!;
  return NextResponse.json(ok(payload, pageMeta(query.page, query.perPage, total)), {
    status: 200,
    headers: { ETag: etag },
  });
});

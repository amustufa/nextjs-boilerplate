# Normalized Responses & Errors

## Envelope

```ts
// core/http/response.ts
export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { type: string; code: string; message: string; details?: unknown; traceId?: string };
  meta?: {
    durationMs?: number;
    // optional pagination fields when applicable
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
};

export const ok = <T>(data: T, meta: Envelope<T>['meta'] = {}): Envelope<T> => ({
  ok: true,
  data,
  meta,
});
export const fail = (err: Envelope<never>['error']): Envelope<never> => ({ ok: false, error: err });
```

### Common Pagination Types

```ts
// core/http/pagination.ts
export type PageParams = { page: number; perPage: number };
export type PageMeta = { page: number; perPage: number; total: number; totalPages: number };
export const pageMeta = (page: number, perPage: number, total: number): PageMeta => ({
  page,
  perPage,
  total,
  totalPages: Math.max(1, Math.ceil(total / Math.max(1, perPage))),
});
```

## Errors

```ts
// core/http/errors.ts
export type ErrorKind =
  | 'validation'
  | 'service'
  | 'repository'
  | 'event'
  | 'job'
  | 'auth'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'unknown';
export class AppError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public code = 'APP_ERROR',
    public details?: unknown,
    public cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('validation', message, 'VALIDATION_FAILED', details);
  }
}
export class ServiceError extends AppError {
  constructor(message: string, code = 'SERVICE_ERROR', details?: unknown) {
    super('service', message, code, details);
  }
}
export class RepositoryError extends AppError {
  constructor(message: string, details?: unknown) {
    super('repository', message, 'REPOSITORY_ERROR', details);
  }
}
export class EventError extends AppError {
  constructor(message: string, details?: unknown) {
    super('event', message, 'EVENT_ERROR', details);
  }
}
export class JobError extends AppError {
  constructor(message: string, details?: unknown) {
    super('job', message, 'JOB_ERROR', details);
  }
}

export function normalizeError(err: unknown) {
  let httpStatus = 500;
  let type = 'unknown',
    code = 'UNKNOWN',
    message = 'Unexpected error',
    details: unknown;
  if (err instanceof AppError) {
    type = err.kind;
    code = err.code;
    message = err.message;
    details = err.details;
    if (err.kind === 'validation') httpStatus = 422;
    else if (err.kind === 'auth') httpStatus = 401;
    else if (err.kind === 'not_found') httpStatus = 404;
    else if (err.kind === 'conflict') httpStatus = 409;
    else if (err.kind === 'rate_limit') httpStatus = 429;
    else httpStatus = 400;
  }
  if ((err as any)?.name === 'ZodError') {
    type = 'validation';
    code = 'VALIDATION_FAILED';
    message = 'Invalid input';
    details = (err as any).issues;
    httpStatus = 422;
  }
  return { httpStatus, error: { type, code, message, details } };
}
```

## Conventions

- Include `traceId` in error envelope for log correlation.
- List endpoints include pagination in `meta`: `{ page, perPage, total, totalPages }`.
- Support `ETag`/`If-None-Match` for GET and return `304` when unchanged.

### Example (paginated)

```ts
// modules/users/http/list.api.ts
import { defineRequest, HttpRequest } from '@/core/http/request';
import { ok } from '@/core/http/response';
import { pageMeta } from '@/core/http/pagination';
import { z } from 'zod';

const ListUsersRequest = defineRequest({
  body: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}),
});

export const GET = HttpRequest(ListUsersRequest)({}, async function () {
  const { query } = this.validate();
  const skip = (query.page - 1) * query.perPage;
  const [items, total] = await Promise.all([
    this.services.db.user.findMany({ skip, take: query.perPage }),
    this.services.db.user.count(),
  ]);
  return ok(items, pageMeta(query.page, query.perPage, total));
});
```

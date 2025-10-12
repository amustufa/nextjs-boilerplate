import { NextResponse } from 'next/server';
import { fail } from '@/core/http/response';

export function unauthorized(traceId?: string): ReturnType<typeof NextResponse.json> {
  const err: Parameters<typeof fail>[0] = {
    type: 'auth',
    code: 'UNAUTHORIZED',
    message: 'Unauthorized',
    details: null,
    ...(traceId ? { traceId } : {}),
  };
  return NextResponse.json(fail(err), { status: 401 });
}

export function forbid(traceId?: string): ReturnType<typeof NextResponse.json> {
  const err: Parameters<typeof fail>[0] = {
    type: 'auth',
    code: 'FORBIDDEN',
    message: 'Forbidden',
    details: null,
    ...(traceId ? { traceId } : {}),
  };
  return NextResponse.json(fail(err), { status: 403 });
}

export function notFound(traceId?: string): ReturnType<typeof NextResponse.json> {
  const err: Parameters<typeof fail>[0] = {
    type: 'not_found',
    code: 'NOT_FOUND',
    message: 'Not Found',
    details: null,
    ...(traceId ? { traceId } : {}),
  };
  return NextResponse.json(fail(err), { status: 404 });
}

export function tooManyRequests(
  retryAfterSec: number,
  traceId?: string,
): ReturnType<typeof NextResponse.json> {
  const err: Parameters<typeof fail>[0] = {
    type: 'rate_limit',
    code: 'RATE_LIMITED',
    message: 'Too Many Requests',
    details: null,
    ...(traceId ? { traceId } : {}),
  };
  return NextResponse.json(fail(err), {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSec) },
  });
}

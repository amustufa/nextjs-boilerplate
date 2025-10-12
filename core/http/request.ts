import { NextResponse } from 'next/server';
import { z, type ZodTypeAny } from 'zod';
import { getServices } from '@/core/runtime/services';
import { ok, fail } from '@/core/http/response';
import { normalizeError } from '@/core/http/errors';
import type { Services } from '@/core/services';
import type { AuthUser } from '@/core/http/auth';
import { getAuthUser } from '@/core/http/auth';
import { unauthorized } from '@/core/http/middleware';

type Spec<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny> = {
  body: B;
  query: Q;
  params: P;
};
type Opts = { auth?: boolean; runtime?: 'node' | 'edge'; status?: number };

export type RequestTools<B, Q, P> = {
  validate(): { body: B; query: Q; params: P };
  services: Services;
  user: AuthUser | null;
  request: Request;
};

export function defineRequest<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny>(
  spec: Spec<B, Q, P>,
): Spec<B, Q, P> {
  return spec;
}

export function HttpRequest<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny>(
  spec: Spec<B, Q, P>,
): (
  opts: Opts,
  handler: (
    this: RequestTools<z.infer<B>, z.infer<Q>, z.infer<P>>,
    ctx?: RequestTools<z.infer<B>, z.infer<Q>, z.infer<P>>,
  ) => Promise<unknown> | unknown,
) => (request: Request, ctx: unknown) => Promise<Response> {
  type Body = z.infer<B>;
  type Query = z.infer<Q>;
  type Params = z.infer<P>;
  return (
    opts: Opts = {},
    handler: (
      this: RequestTools<Body, Query, Params>,
      ctx?: RequestTools<Body, Query, Params>,
    ) => Promise<unknown> | unknown,
  ) => {
    return async (request: Request, ctx: unknown) => {
      const started = Date.now();
      try {
        const traceId = (globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2)) as string;
        const url = new URL(request.url);
        const queryObj = Object.fromEntries(url.searchParams.entries());
        const rawBody: unknown = ['GET', 'HEAD'].includes(request.method)
          ? {}
          : await request.json().catch(() => undefined);
        const body = spec.body.parse(rawBody) as Body;
        const query = spec.query.parse(queryObj) as Query;
        const params = (() => {
          if (
            typeof ctx === 'object' &&
            ctx !== null &&
            'params' in (ctx as Record<string, unknown>)
          ) {
            const v = (ctx as { params?: unknown }).params ?? {};
            return spec.params.parse(v as unknown) as Params;
          }
          return spec.params.parse({} as unknown) as Params;
        })();
        const services = await getServices(opts.runtime ?? 'node');
        const user = opts.auth ? await getAuthUser(request) : null;
        if (opts.auth && !user) return unauthorized(traceId);
        const tools: RequestTools<Body, Query, Params> = {
          validate: () => ({ body, query, params }),
          services,
          user,
          request,
        };
        const data = await Promise.resolve(handler.call(tools, tools));
        if (data && typeof data === 'object' && 'ok' in (data as { ok: unknown })) {
          return NextResponse.json(data, { status: opts.status ?? 200 });
        }
        return NextResponse.json(ok(data, { durationMs: Date.now() - started }), {
          status: opts.status ?? 200,
        });
      } catch (e) {
        const { httpStatus, error } = normalizeError(e);
        const traceId = (globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2)) as string;
        return NextResponse.json(fail({ ...error, traceId }), { status: httpStatus });
      }
    };
  };
}

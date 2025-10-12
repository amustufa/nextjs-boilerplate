import { NextResponse } from 'next/server';
import { z, type ZodTypeAny } from 'zod';
import { getServices } from '@/core/runtime/services';
import { ok, fail } from '@/core/http/response';
import { normalizeError } from '@/core/http/errors';
import type { Services } from '@/core/services';
import type { AuthUser, Policy } from '@/core/http/auth';
import { getAuthUser } from '@/core/http/auth';
import { unauthorized, tooManyRequests, forbid } from '@/core/http/middleware';
import {
  defaultKeyBuilder,
  getDefaultRateLimitPolicy,
  limit,
  limitWithCache,
  type RateLimitPolicy,
} from '@/core/http/rate-limit';

type Spec<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny> = {
  body: B;
  query: Q;
  params: P;
};
export type PolicyCheck<T = unknown> = {
  policy: Policy<T>;
  resource?: (t: RequestTools<unknown, unknown, unknown>) => Promise<T> | T;
  when?: (t: RequestTools<unknown, unknown, unknown>) => boolean;
  fail?: { code?: string; message?: string };
};
export type PolicyCheckFn = (
  t: RequestTools<unknown, unknown, unknown>,
) => Promise<boolean> | boolean;

type Opts = {
  auth?: boolean;
  runtime?: 'node' | 'edge';
  status?: number;
  rateLimit?: false | RateLimitPolicy;
  policies?: (PolicyCheck | PolicyCheckFn)[];
  policiesMode?: 'all' | 'any';
  policiesFail?: { code?: string; message?: string };
};

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
        // Rate limiting (global switch off via RATE_LIMIT_DISABLED)
        if (process.env.RATE_LIMIT_DISABLED !== 'true') {
          const policy: RateLimitPolicy | undefined =
            opts.rateLimit === false
              ? undefined
              : (opts.rateLimit ?? getDefaultRateLimitPolicy(request.method));
          if (policy) {
            const url = new URL(request.url);
            const forwarded = request.headers.get('x-forwarded-for') ?? 'ip:unknown';
            const args: Parameters<NonNullable<RateLimitPolicy['key']>>[0] = {
              method: request.method,
              pathname: url.pathname,
              ...(user?.id ? ({ userId: user.id } as { userId: string }) : {}),
              ...(forwarded ? ({ ip: forwarded } as { ip: string }) : {}),
            };
            const key = (policy.key ?? defaultKeyBuilder)(args);
            const res = policy.useCache
              ? await limitWithCache(services.cache, key, {
                  capacity: policy.capacity,
                  refillPerSec: policy.refillPerSec,
                })
              : limit(key, { capacity: policy.capacity, refillPerSec: policy.refillPerSec });
            if (!res.allowed) return tooManyRequests(res.retryAfterSec ?? 1, traceId);
          }
        }

        // Policy checks (require auth: true)
        if (Array.isArray(opts.policies) && opts.policies.length > 0) {
          if (!opts.auth || !user) {
            return unauthorized(traceId);
          }
          const mode = opts.policiesMode ?? 'all';
          const results: boolean[] = [];
          let firstOverride: { code?: string; message?: string } | undefined;
          for (const p of opts.policies) {
            if (typeof p === 'function') {
              const ok = await Promise.resolve(p(tools));
              results.push(!!ok);
            } else {
              if (p.when && !p.when(tools)) {
                results.push(true);
                continue;
              }
              const res = p.resource ? await Promise.resolve(p.resource(tools)) : undefined;
              const ok = await Promise.resolve(
                (p.policy as Policy<unknown>)(user as AuthUser, res as unknown),
              );
              if (!ok && !firstOverride) firstOverride = p.fail;
              results.push(!!ok);
            }
          }
          const passed = mode === 'all' ? results.every(Boolean) : results.some(Boolean);
          if (!passed) {
            const override = firstOverride ?? opts.policiesFail;
            if (override?.code || override?.message) {
              return NextResponse.json(
                fail({
                  type: 'auth',
                  code: override.code ?? 'FORBIDDEN',
                  message: override.message ?? 'Forbidden',
                  details: null,
                  ...(traceId ? { traceId } : {}),
                }),
                { status: 403 },
              );
            }
            return forbid(traceId);
          }
        }

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

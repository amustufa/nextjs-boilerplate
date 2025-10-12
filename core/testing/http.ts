export type Handler = (request: Request, ctx: { params: unknown }) => Promise<Response> | Response;

export async function runHandler<T = unknown>(
  handler: Handler,
  opts: {
    method?: string;
    url?: string;
    body?: unknown;
    params?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<{ status: number; json: T }> {
  const method = opts.method ?? 'GET';
  const url = opts.url ?? 'http://localhost/api/test';
  const headers = new Headers(opts.headers ?? {});
  let init: RequestInit = { method, headers };
  if (opts.body != null && method !== 'GET' && method !== 'HEAD') {
    headers.set('content-type', 'application/json');
    init.body = JSON.stringify(opts.body);
  }
  const req = new Request(url, init);
  const res = await handler(req, { params: opts.params ?? {} });
  const json = (await res.json()) as T;
  return { status: res.status, json } as const;
}

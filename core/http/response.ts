export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { type: string; code: string; message: string; details?: unknown; traceId?: string };
  meta?: {
    durationMs?: number;
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
export const fail = (err: NonNullable<Envelope<never>['error']>): Envelope<never> => ({
  ok: false,
  error: err,
});

# API Conventions

- Envelope shape `{ ok, data?, error?, meta? }` is mandatory; errors include `traceId`.
- Pagination params: `page`, `perPage`, `sort`, `filter`; response `meta` includes `{ page, perPage, total, totalPages }`.
- Versioning with `(v1)` route groups and deprecation notes.
- Rate limit sensitive endpoints and return `429` with `Retry-After`.
- Support `ETag` on GET and 304 responses when unchanged.

## Rate Limiting

- Configure rate limiting via `HttpRequest(RequestSpec)({ rateLimit: { capacity, refillPerSec, key?, useCache? } }, handler)`.
- Central default policy applies per HTTP method when `rateLimit` is not provided; disable explicitly with `rateLimit: false`.
- Default key combines method + pathname + user id (if authenticated) or IP (`x-forwarded-for`).
- `useCache: true` uses the shared `services.cache` for distributed limits; otherwise a dev-only in-memory limiter is used.
- Global switch: set `RATE_LIMIT_DISABLED=true` to disable limiting (e.g., local dev/test).

## Output Shapes

- Avoid DTO normalization classes; produce outputs by applying typed pipes over Prisma‑selected rows.
- Each endpoint defines its Prisma `select` and a `Pipe<SelectedRow, ViewType>` (see 04-domain-data-interfaces.md).

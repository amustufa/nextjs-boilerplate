# API Conventions

- Envelope shape `{ ok, data?, error?, meta? }` is mandatory; errors include `traceId`.
- Pagination params: `page`, `perPage`, `sort`, `filter`; response `meta` includes `{ page, perPage, total, totalPages }`.
- Versioning with `(v1)` route groups and deprecation notes.
- Rate limit sensitive endpoints and return `429` with `Retry-After`.
- Support `ETag` on GET and 304 responses when unchanged.

## Output Shapes

- Avoid DTO normalization classes; produce outputs by applying typed pipes over Prisma‑selected rows.
- Each endpoint defines its Prisma `select` and a `Pipe<SelectedRow, ViewType>` (see 04-domain-data-contracts.md).

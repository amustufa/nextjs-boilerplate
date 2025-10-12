# Security & Authorization

- Policy-based authorization with explicit policies in `modules/*/domain/policies` and a centralized authorize() helper.
- Enforce authorization before repositories; emit audit events for sensitive actions `{ actorId, action, target, traceId }`.
- Rate-limit auth and mutation endpoints; document CSRF/session strategy per auth mode.
  - Use the HttpRequest `rateLimit` option for per-handler policy, or rely on the central default (per HTTP method). Prefer user-based keys when authenticated; IP-based fallback otherwise. Use `useCache: true` for distributed limits.
  - Disable globally in dev/test via `RATE_LIMIT_DISABLED=true`.
- Secrets rotation procedures and strict log redaction for sensitive material.

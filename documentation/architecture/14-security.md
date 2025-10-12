# Security & Authorization

- Policy-based authorization with explicit policies in `modules/*/domain/policies` and a centralized authorize() helper.
- Enforce authorization before repositories; emit audit events for sensitive actions `{ actorId, action, target, traceId }`.
- Rate-limit auth and mutation endpoints; document CSRF/session strategy per auth mode.
- Secrets rotation procedures and strict log redaction for sensitive material.

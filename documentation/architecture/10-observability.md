# Logging & Observability

- Structured JSON logs with redaction and per-request context; include `traceId` in responses and logs.
- Controller logs start/end with `{ method, route, status, durationMs, module, runtime }` and normalizes errors.
- Redaction policy: never log secrets/PII; redact keys containing `PASSWORD`, `SECRET`, `TOKEN`, `KEY`, `AUTH`, `COOKIE`.
- Tracing: wrap DB/HTTP calls with spans/timers; optional OpenTelemetry can be added later.

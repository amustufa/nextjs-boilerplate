# Caching Strategy & Invalidation

- Default TTLs per resource; prefer SWR for list reads and stale-on-error for non-critical endpoints.
- Cache keys follow `module:resource:paramsHash`.
- Invalidation is event-driven: subscribe to domain events and evict related keys in module boot.
- Edge routes use edge-safe caches (KV/CDN); Node routes can use Redis/in-memory with care.
- Never cache PII unless encrypted.

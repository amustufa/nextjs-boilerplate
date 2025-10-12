# Runtime & Operations

- Health vs Readiness: health means the process is up; readiness requires critical downstreams (db/cache/queue) to be reachable.
- Each route declares runtime; edge routes must not resolve node-only deps. Treat edge handlers as thin, stateless functions (no event listeners, no job processors, no Node-only logging).
- Add bundle analysis in CI and guardrails for edge safety.
- Feature flags via a provider; flags evaluated in server context; document naming and rollout rules.

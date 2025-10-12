# Next Steps

1. Add pino logger + request IDs to include `traceId` in the error envelope.
2. Add a Prisma Data Proxy/Accelerate path for edge runtimes and bind `db` by runtime.
3. Provide a `core/testing` kit to assert envelopes and to fake mediator handlers in unit tests.
4. Add a CLI scaffold for `usecase` to register mediator handlers + Zod schemas.

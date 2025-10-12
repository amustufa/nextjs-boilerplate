# Server-First UI State Management

Principles

- Server-first: derive UI from server data; mutate via server actions or API handlers; revalidate to refresh views.
- Client state is ephemeral: keep it to local UI concerns (inputs, toggles). No global client stores by default.
- Cookies: allowed when necessary (auth/session, trivial UI preferences), but never for business state, drafts, filters, or workflow state.

Approved Patterns

- Reads: Server components call Services or internal API from the server. Use `revalidateTag`/`revalidatePath` as needed.
- Writes: Server actions or route handlers perform mutations, emit events, and invalidate caches/tags. Client receives minimal signals.
- Drafts/Multi-step flows: persist server-side (DB/Redis/KV) with TTL; pass signed IDs in links (not cookies).

Users Module Examples

- Server Action variant: server component loads data via Services and posts via a server action that uses Services directly.
- API Handler variant: server component loads data via server-side fetch to the API route; form submits to a server action that proxies to the API handler.

Anti-Patterns (Forbidden)

- Using cookies to carry business or workflow state (drafts, filters, pagination, multi-step progress).
- Defaulting to client global stores for source-of-truth state.
- Storing business state in `localStorage`/`sessionStorage`.

Edge Notes

- Edge handlers remain thin; same rules apply. Do not use cookies to shuttle state; persist on server stores and use signed IDs.

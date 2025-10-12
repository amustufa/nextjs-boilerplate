# Users UI Guidelines

Structure

- `components/*`: pure presentational (props-only). No Services/fetch/cookies/revalidate.
- `fragments/*`: composite pieces that compose components. Same rules as components.
- `forms/*`: form components that receive a server action via `action` prop; no Services/fetch.
- `loaders/` or `loaders.ts`: server-only data loaders (import 'server-only'); may use `getServices`; no JSX.
- `hooks/*`: client-only hooks for ephemeral UI state (no business state).

Routing

- Pages/route handlers and route-local server actions live under `app/`. Compose module UI from there.

Types

- Use named types exported via `modules/users/types.ts` for props and loader results; avoid inline object types in exported signatures.

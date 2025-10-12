# Data & Migrations (Prisma v6.7)

- Schema composition (module-local): Keep module schemas next to code (e.g., `modules/*/schema/*.prisma`). Maintain a minimal `prisma/base.prisma` with `datasource` + `generator` only.
- Collector step: Before running Prisma CLI, copy or symlink module schema files into `prisma/schemas/` so Prisma can merge them.
- Seeds and factories per module are idempotent and used across integration/e2e tests.
- Transactions: Single-module invariants use DB transactions; cross-module workflows use mediator (sagas) plus outbox events.
- Multi-tenancy (optional): schema-per-tenant or row-based `tenantId`; repositories must enforce tenant filters.

## Collector Script (symlink)

```ts
// scripts/prisma-collect.ts
#!/usr/bin/env tsx
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dest = path.join(root, 'prisma', 'schemas');
await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(dest, { recursive: true });

const files: string[] = [];
await walk(path.join(root, 'modules'));
for (const f of files) {
  const base = path.basename(f);
  const target = path.join(dest, base);
  const rel = path.relative(path.dirname(target), f);
  await fs.rm(target, { force: true });
  await fs.symlink(rel, target, 'file');
}
console.log(`Collected ${files.length} prisma schema files to prisma/schemas/`);

async function walk(dir: string) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.isFile() && e.name.endsWith('.prisma')) files.push(p);
  }
}
```

## Prisma CLI

- Keep `prisma/base.prisma` with `datasource` + `generator`.
- Place collected module schemas under `prisma/schemas/*.prisma`.
- Run: `prisma migrate dev --schema prisma` and `prisma generate --schema prisma`.

## Scripts

```json
// package.json (excerpt)
{
  "scripts": {
    "prisma:collect": "tsx scripts/prisma-collect.ts",
    "prisma:migrate": "pnpm prisma:collect && prisma migrate dev --schema prisma",
    "prisma:generate": "pnpm prisma:collect && prisma generate --schema prisma"
  }
}
```

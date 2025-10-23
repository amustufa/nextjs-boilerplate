#!/usr/bin/env tsx
/*
  Interactive module scaffolder.
  Usage: pnpm module:generate
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toPascal(input: string): string {
  return toSlug(input)
    .split('-')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function writeFileIfMissing(p: string, content: string): Promise<void> {
  if (await exists(p)) return;
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, content, 'utf8');
}

async function main() {
  const rl = createInterface({ input, output });
  try {
    console.log('Module scaffolder');
    const nameInput = (await rl.question('Module name (e.g. posts): ')).trim();
    if (!nameInput) throw new Error('Module name is required');
    const slug = toSlug(nameInput);
    const Pascal = toPascal(nameInput);
    const root = process.cwd();
    const modRoot = path.join(root, 'modules', slug);
    if (await exists(modRoot)) {
      const overwrite = (
        await rl.question(`Module '${slug}' exists. Continue and skip existing files? (y/N): `)
      )
        .trim()
        .toLowerCase();
      if (overwrite !== 'y' && overwrite !== 'yes') {
        console.log('Aborted.');
        return;
      }
    }

    const genService = (
      (await rl.question('Generate domain service? (Y/n): ')).trim().toLowerCase() || 'y'
    ).startsWith('y');
    const genHttp = (
      (await rl.question('Generate HTTP handlers? (Y/n): ')).trim().toLowerCase() || 'y'
    ).startsWith('y');
    const genSchema = (
      (await rl.question('Generate Prisma schema file? (Y/n): ')).trim().toLowerCase() || 'y'
    ).startsWith('y');
    const genSeed = (
      (await rl.question('Generate example seed? (Y/n): ')).trim().toLowerCase() || 'y'
    ).startsWith('y');
    const genEventsJobs = (
      (await rl.question('Generate events/jobs stubs? (Y/n): ')).trim().toLowerCase() || 'y'
    ).startsWith('y');
    const wireRuntime = (
      (await rl.question('Wire into services bootstrap now? (y/N): ')).trim().toLowerCase() || 'n'
    ).startsWith('y');

    // index.ts (module)
    const indexTs = `import type { Module } from '@/core/module';
import type { ServicesBuilder } from '@/core/services';
${genService ? `import { ${Pascal}Service } from './domain/services/${slug}.service';` : ''}
${
  genEventsJobs
    ? `import { register${Pascal}Events } from './events/on${Pascal}Event';
import { register${Pascal}JobProcessors } from './jobs/${slug}.job';`
    : ''
}

export const ${Pascal}Module: Module = {
  name: '${slug}',
  register(services: ServicesBuilder) {
    services.namespace('${slug}', (ns) => {
      ${genService ? `ns.set('service', (s) => new ${Pascal}Service(s.db, s.cache));` : '// add services here'}
    });
  },
  async boot({ services }) {
    const s = await services;
    ${
      genEventsJobs
        ? `register${Pascal}Events(s);
    register${Pascal}JobProcessors(s);`
        : '// wire events/jobs here'
    }
  },
};

export default ${Pascal}Module;
`;
    await writeFileIfMissing(path.join(modRoot, 'index.ts'), indexTs);

    // Service
    if (genService) {
      const serviceTs = `import type { Cache } from '@/core/services';

export class ${Pascal}Service {
  constructor(
    // Use Prisma client from services when needed
    private prisma: unknown,
    private cache?: Cache,
  ) {}
}
`;
      await writeFileIfMissing(
        path.join(modRoot, 'domain', 'services', `${slug}.service.ts`),
        serviceTs,
      );
      const augment = `declare global {
  interface AppServiceNamespaces {
    ${slug}: {
      service: import('./domain/services/${slug}.service').${Pascal}Service;
    };
  }
}

export {};
`;
      await writeFileIfMissing(path.join(modRoot, 'services.augment.d.ts'), augment);
    }

    // HTTP example
    if (genHttp) {
      const httpTs = `import { HttpRequest, defineRequest } from '@/core/http/request';
import { ok } from '@/core/http/response';
import { z } from 'zod';

const DemoRequest = defineRequest({
  body: z.object({}),
  query: z.object({}),
  params: z.object({}),
});

export const GET = HttpRequest(DemoRequest)({ auth: false }, async function () {
  return ok({ module: '${slug}', status: 'ok' });
});
`;
      await writeFileIfMissing(path.join(modRoot, 'http', `${slug}.api.ts`), httpTs);
    }

    // Events/jobs stubs
    if (genEventsJobs) {
      const eventsTs = `import type { Services } from '@/core/services';

export function register${Pascal}Events(services: Services): void {
  // services.events.on('event', async (payload) => { /* ... */ });
  services.logger.info({ module: '${slug}' }, 'Events registered');
}
`;
      await writeFileIfMissing(path.join(modRoot, 'events', `on${Pascal}Event.ts`), eventsTs);
      const jobsTs = `import type { Services } from '@/core/services';

export function register${Pascal}JobProcessors(services: Services): void {
  // services.queue.process?.('${slug}.job', async (payload) => { /* ... */ });
  services.logger.info({ module: '${slug}' }, 'Job processors registered');
}
`;
      await writeFileIfMissing(path.join(modRoot, 'jobs', `${slug}.job.ts`), jobsTs);
    }

    // Prisma schema stub
    if (genSchema) {
      const schema = `// ${slug} module Prisma schema
// Define your models here, e.g.:
// model ${Pascal} {
//   id        String   @id @default(cuid())
//   name      String
//   createdAt DateTime @default(now())
// }
`;
      await writeFileIfMissing(path.join(modRoot, 'schema', `${slug}.prisma`), schema);
    }

    // Seed example
    if (genSeed) {
      const seed = `import type { Seeder } from '@/core/seeds/types';

const seed: Seeder = {
  name: 'Example ${slug} seed',
  order: 100,
  tags: ['dev'],
  async run({ logger }) {
    logger.info({ module: '${slug}' }, 'Seed ran');
  },
};

export default seed;
`;
      await writeFileIfMissing(path.join(modRoot, 'seeds', `001_${slug}.seed.ts`), seed);
    }

    // UI placeholder and dirs
    await writeFileIfMissing(
      path.join(modRoot, 'ui', 'README.md'),
      `UI components for ${slug} module.`,
    );
    await ensureDir(path.join(modRoot, 'data'));
    await ensureDir(path.join(modRoot, 'contracts'));
    await ensureDir(path.join(modRoot, 'tests'));

    // Optional wiring into services runtime
    let wired = false;
    if (wireRuntime) {
      const servicesFile = path.join(root, 'core', 'runtime', 'services.ts');
      if (await exists(servicesFile)) {
        let src = await fs.readFile(servicesFile, 'utf8');
        const importLine = `import { ${Pascal}Module } from '@/modules/${slug}';`;
        if (!src.includes(importLine)) {
          src = src.replace(
            "import { UsersModule } from '@/modules/users';",
            (m) => `${m}\n${importLine}`,
          );
        }
        if (!src.includes(`${Pascal}Module.register`)) {
          src = src.replace(
            /const steps: BuilderFn\[\] = \[/,
            (m) => `${m}\n    ${Pascal}Module.register,`,
          );
        }
        if (!src.includes(`${Pascal}Module.boot?.({ services: Promise.resolve(services) });`)) {
          src = src.replace(
            /return UsersModule\.boot\?\(\{ services: Promise\.resolve\(services\) \}\);/,
            (m) => `${m}\n      ${Pascal}Module.boot?.({ services: Promise.resolve(services) });`,
          );
        }
        await fs.writeFile(servicesFile, src, 'utf8');
        wired = true;
      }
    }

    console.log('\nScaffold complete!');
    console.log(`- Module: modules/${slug}`);
    if (genSchema) console.log('- Run: pnpm prisma:collect && pnpm prisma:generate');
    if (wired) console.log('- Wired into services runtime.');
    else
      console.log(
        '- To wire it, import the module in core/runtime/services.ts and add its register/boot like UsersModule.',
      );
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env tsx
/*
  Seed runner CLI (Laravel-like) for modular seeds.

  Usage examples:
    pnpm db:seed
    pnpm db:seed --preview
    pnpm db:seed --only users,posts
    pnpm db:seed --tags dev
    pnpm db:seed --continue
    NODE_ENV=production pnpm db:seed --force
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getServices } from '@/core/runtime/services';
import type { Seeder } from '@/core/seeds/types';

type LoadedSeed = {
  id: string;
  module: string;
  file: string;
  order: number;
  tags: string[];
  seeder: Seeder;
};

const argv = process.argv.slice(2);

function hasFlag(name: string): boolean {
  return argv.some((a) => a === name);
}

function getArg(name: string): string | null {
  const i = argv.findIndex((a) => a === name || a.startsWith(name + '='));
  if (i === -1) return null;
  const v = argv[i];
  if (!v) return null;
  if (v.includes('=')) return (v.split('=')[1] ?? null) as string | null;
  return (argv[i + 1] ?? null) as string | null;
}

function getListArg(name: string): string[] {
  const val = getArg(name);
  if (!val) return [];
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function findFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && (p.endsWith('.seed.ts') || p.endsWith('.seed.js'))) out.push(p);
    }
  }
  if (await exists(dir)) await walk(dir);
  return out;
}

async function discoverSeeds(root: string): Promise<LoadedSeed[]> {
  const seeds: LoadedSeed[] = [];
  const modulesDir = path.join(root, 'modules');
  const globalDir = path.join(root, 'seeds', 'global');

  // Module seeds
  if (await exists(modulesDir)) {
    for (const e of await fs.readdir(modulesDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const moduleName = e.name;
      const seedsDir = path.join(modulesDir, moduleName, 'seeds');
      const files = await findFiles(seedsDir);
      for (const f of files) {
        const id = path.basename(f).replace(/\.(ts|js)$/i, '');
        const mod = (await import(pathToFileURL(f).href)) as { default?: Seeder };
        const seeder = mod.default;
        if (!seeder || typeof seeder.run !== 'function') {
          console.warn(`Skipping ${f}: default export with run(ctx) not found.`);
          continue;
        }
        seeds.push({
          id,
          module: moduleName,
          file: f,
          order: seeder.order ?? 100,
          tags: seeder.tags ?? [],
          seeder,
        });
      }
    }
  }

  // Global seeds (optional)
  for (const f of await findFiles(globalDir)) {
    const id = path.basename(f).replace(/\.(ts|js)$/i, '');
    const mod = (await import(pathToFileURL(f).href)) as { default?: Seeder };
    const seeder = mod.default;
    if (!seeder || typeof seeder.run !== 'function') {
      console.warn(`Skipping ${f}: default export with run(ctx) not found.`);
      continue;
    }
    seeds.push({
      id,
      module: 'global',
      file: f,
      order: seeder.order ?? 100,
      tags: seeder.tags ?? [],
      seeder,
    });
  }

  return seeds;
}

async function main() {
  const root = process.cwd();
  const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const onlyModules = getListArg('--only');
  const onlyModuleAlias = getArg('--module');
  if (onlyModuleAlias) onlyModules.push(onlyModuleAlias);
  const tags = getListArg('--tags');
  const preview = hasFlag('--preview');
  const force = hasFlag('--force');
  const cont = hasFlag('--continue');
  const fresh = hasFlag('--fresh');

  if (env === 'production' && !force) {
    console.error('Refusing to run seeds in production without --force');
    process.exit(1);
  }
  if (fresh) {
    console.warn('--fresh specified: table truncation is not implemented by default.');
  }

  const discovered = await discoverSeeds(root);
  let selected = discovered;
  if (onlyModules.length) selected = selected.filter((s) => onlyModules.includes(s.module));
  if (tags.length) selected = selected.filter((s) => s.tags.some((t) => tags.includes(t)));

  // Stable order
  selected.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));

  if (preview) {
    console.log(
      JSON.stringify(
        selected.map((s) => ({
          module: s.module,
          id: s.id,
          order: s.order,
          tags: s.tags,
          file: path.relative(root, s.file),
        })),
        null,
        2,
      ),
    );
    return;
  }

  const services = await getServices('node');
  const logger = services.logger;
  console.log(`Seeding ${selected.length} seeders (env=${env})...`);
  logger.info({ count: selected.length, env }, 'Seed start');

  let ok = 0;
  let failed = 0;
  for (const s of selected) {
    const display = `${s.module}:${s.seeder.name || s.id}`;
    const started = Date.now();
    try {
      await s.seeder.run({ db: services.db, services, logger, env });
      ok += 1;
      const ms = Date.now() - started;
      console.log(`✔ ${display} (${ms}ms)`);
      logger.info({ seeder: display, ms }, 'Seed success');
    } catch (e) {
      failed += 1;
      const err = e as Error;
      console.error(`✖ ${display}: ${err.message}`);
      logger.error({ seeder: display, err }, 'Seed failed');
      if (!cont) {
        console.error('Aborting on first failure. Use --continue to run remaining.');
        process.exit(1);
      }
    }
  }

  console.log(`Done. ok=${ok} failed=${failed}`);
  logger.info({ ok, failed }, 'Seed finished');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

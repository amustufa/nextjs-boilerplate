#!/usr/bin/env tsx
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dest = path.join(root, 'prisma', 'schemas');

async function main() {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });

  const files: string[] = [];
  const stray: string[] = [];
  await walk(path.join(root, 'modules'), files, stray);
  for (const f of files) {
    const base = path.basename(f);
    const target = path.join(dest, base);
    // Remove existing file/symlink if present
    await fs.rm(target, { force: true });
    // Create a relative symlink for portability
    const rel = path.relative(path.dirname(target), f);
    await fs.symlink(rel, target, 'file');
  }
  console.log(`Collected ${files.length} prisma schema files to prisma/schemas/`);
  if (stray.length) {
    console.warn(
      `Warning: Found .prisma files outside schema/ directories. Move them under modules/<module>/schema/*.prisma to include in collection.\n` +
        stray.map((s) => ` - ${path.relative(root, s)}`).join('\n'),
    );
  }
}

async function walk(dir: string, files: string[], stray: string[]) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, files, stray);
    else if (e.isFile() && e.name.endsWith('.prisma')) {
      // enforce convention: only collect under modules/**/schema/*.prisma
      const parts = p.split(path.sep);
      if (parts.includes('schema')) files.push(p);
      else stray.push(p);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

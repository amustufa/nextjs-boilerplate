#!/usr/bin/env node
// Block commits that change source without changing tests.
// Reads staged files and requires at least one test change when core/ or modules/ sources change.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getStagedFiles() {
  try {
    const out = execSync('git diff --name-only --cached', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return out ? out.split('\n') : [];
  } catch {
    return [];
  }
}

function isSourceFile(fp) {
  if (!/\.(ts|tsx)$/.test(fp)) return false;
  if (fp.includes('/tests/')) return false;
  if (/\.d\.ts$/.test(fp)) return false;
  if (/\.test\.(ts|tsx)$/.test(fp)) return false;
  return fp.startsWith('core/') || fp.startsWith('modules/');
}

function isTestFile(fp) {
  if (!/\.(ts|tsx)$/.test(fp)) return false;
  if (/\.test\.(ts|tsx)$/.test(fp)) return true;
  return fp.includes('/tests/');
}

function loadExemptPatterns() {
  const patterns = [];
  const env = process.env.TDD_EXEMPT_GLOBS;
  if (env) patterns.push(...env.split(',').map((s) => s.trim()).filter(Boolean));
  const file = path.resolve(process.cwd(), '.tdd-exempt');
  if (fs.existsSync(file)) {
    const lines = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    patterns.push(...lines);
  }
  return patterns;
}

function globToRegex(glob) {
  // Escape regex special chars including character class tokens
  const esc = glob.replace(/[-\\^$+?.()|[\]{}]/g, '\\$&');
  const dotstar = esc.replace(/\*\*/g, '::DS::').replace(/\*/g, '[^/]*').replace(/::DS::/g, '.*');
  return new RegExp('^' + dotstar + '$');
}

const staged = getStagedFiles();
const exempt = loadExemptPatterns().map(globToRegex);
const sourceChanged = staged.filter((fp) => isSourceFile(fp) && !exempt.some((r) => r.test(fp)));
const testsChanged = staged.filter(isTestFile);

if (sourceChanged.length > 0 && testsChanged.length === 0) {
  const details = sourceChanged.map((s) => `  - ${s}`).join('\n');
  console.error(
    `\nTDD enforcement: you changed source files without staging tests.\n` +
      `Add or update at least one test file (*.test.ts[x] or files under */tests/*).\n\n` +
      `Changed source files:\n${details}\n\n` +
      `If you must override, commit with --no-verify (not recommended).`,
  );
  process.exit(1);
}

process.exit(0);

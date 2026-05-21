// Copies the `.env.example` templates into `.env` for backend and worker.
// Cross-platform replacement for `cp` so the same command works on macOS,
// Linux, and Windows (cmd / PowerShell). Idempotent: never overwrites an
// existing `.env` — that file may already hold real secrets.

import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  { example: 'apps/backend/.env.example', dest: 'apps/backend/.env' },
  { example: 'apps/execution-worker/.env.example', dest: 'apps/execution-worker/.env' },
];

let anyError = false;
for (const { example, dest } of TARGETS) {
  const examplePath = path.join(ROOT, example);
  const destPath = path.join(ROOT, dest);

  if (!existsSync(examplePath)) {
    process.stderr.write(`✗ ${example} missing — cannot create ${dest}\n`);
    anyError = true;
    continue;
  }

  if (existsSync(destPath)) {
    process.stdout.write(`• ${dest} already exists, leaving it alone\n`);
    continue;
  }

  copyFileSync(examplePath, destPath);
  process.stdout.write(`✓ created ${dest} from ${example}\n`);
}

process.exitCode = anyError ? 1 : 0;

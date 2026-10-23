import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { BUILD_FILE, DOCS_FILE, MANIFEST_FILE, PACKAGE_ROOT, REPO_ROOT, TYPEDOC_DIR } from '../src/paths.js';
import { TYPEDOC_RUNS } from '../src/typedoc-runs.js';
import { gitHead } from './git-head.js';

const REBUILD = 'run `pnpm --filter @workflowbuilder/mcp build` first';
// smoke:package packs work in progress on purpose; a publish never sets this.
const ALLOW_DIRTY = 'WB_MCP_PACK_ALLOW_DIRTY';

function stampedRevision(file: string, field: string) {
  try {
    const value = (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return;
  }
}

// Runs as prepack: pack and publish take dist/ as it is on disk, with no build of their own.
function problem(): string | undefined {
  const required = [
    path.join(PACKAGE_ROOT, 'dist/index.js'),
    BUILD_FILE,
    DOCS_FILE,
    MANIFEST_FILE,
    ...TYPEDOC_RUNS.map((run) => path.join(TYPEDOC_DIR, `${run.packageName}.json`)),
  ];
  const missing = required.find((file) => !existsSync(file));
  if (missing) return `${path.relative(PACKAGE_ROOT, missing)} is missing; ${REBUILD}`;

  const head = gitHead();
  if (!head) return 'git cannot read HEAD';
  const stamps: [string, string][] = [
    [BUILD_FILE, 'revision'],
    [DOCS_FILE, 'revision'],
    [MANIFEST_FILE, 'gitHead'],
  ];
  for (const [file, field] of stamps) {
    const revision = stampedRevision(file, field);
    if (revision !== head) {
      return `${path.relative(PACKAGE_ROOT, file)} was built at ${revision ?? 'an unknown commit'}, HEAD is ${head}; ${REBUILD}`;
    }
  }

  if (process.env[ALLOW_DIRTY]) return;
  // The build snapshots files on disk, untracked ones included, so a dirty tree would ship content HEAD lacks.
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, encoding: 'utf8' }).trimEnd();
  if (status) return `the working tree is not clean; commit or remove these, then rebuild:\n${status}`;
}

const found = problem();
if (found) {
  console.error(`prepack: ${found}`);
  process.exitCode = 1;
}

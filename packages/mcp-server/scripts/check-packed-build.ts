import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildCorpus } from '../src/corpus/build-corpus.js';
import { DOCS_FILE, PACKAGE_ROOT, REPO_ROOT } from '../src/paths.js';

// Runs as prepack: pack and publish take dist/ as it is on disk, with no build of their own.
async function problem(): Promise<string | undefined> {
  if (!existsSync(path.join(PACKAGE_ROOT, 'dist/index.js'))) return 'dist/index.js is missing';

  const warnings: string[] = [];
  let corpus: Awaited<ReturnType<typeof buildCorpus>>;
  try {
    corpus = await buildCorpus({ onWarning: (message) => warnings.push(message) });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  if (warnings.length > 0) return warnings.join('; ');
  const { gitHead } = corpus.stats;

  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const { revision } = JSON.parse(readFileSync(DOCS_FILE, 'utf8')) as { revision?: string };
  if (revision !== head) return `dist/data/docs.json was built at ${revision ?? 'an unknown commit'}, HEAD is ${head}`;
  if (gitHead === 'unknown' || !head.startsWith(gitHead))
    return `dist/data/typedoc was built at ${gitHead}, HEAD is ${head}`;
}

const found = await problem();
if (found) {
  console.error(`prepack: ${found}; run \`pnpm --filter @workflowbuilder/mcp build\` first`);
  process.exitCode = 1;
}

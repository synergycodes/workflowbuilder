import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildCorpus } from '../src/corpus/build-corpus.js';
import { PACKAGE_ROOT } from '../src/paths.js';
import { gitHead } from './git-head.js';

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

  const head = gitHead() ?? 'an unreadable HEAD';
  const { docsRevision, gitHead: typedocHead } = corpus.stats;
  if (docsRevision !== head)
    return `dist/data/docs.json was built at ${docsRevision ?? 'an unknown commit'}, HEAD is ${head}`;
  if (typedocHead !== head) return `dist/data/typedoc was built at ${typedocHead}, HEAD is ${head}`;
}

const found = await problem();
if (found) {
  console.error(`prepack: ${found}; run \`pnpm --filter @workflowbuilder/mcp build\` first`);
  process.exitCode = 1;
}

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

import { serializeDocs } from '../src/corpus/build-corpus.js';
import { loadDocs } from '../src/corpus/load-docs.js';
import { DATA_DIR, DOCS_FILE, REPO_ROOT } from '../src/paths.js';

function headCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'main';
  }
}

const warnings: string[] = [];
const revision = headCommit();
const snapshot = await loadDocs({
  revision,
  onWarning: (message) => {
    warnings.push(message);
    console.error(`docs-data: ${message}`);
  },
});

// The package ships this snapshot, so a page that failed to load would be missing for every consumer.
if (warnings.length > 0) {
  console.error(`docs-data: ${warnings.length} problem(s) above, fix them before building`);
  process.exitCode = 1;
} else {
  const json = serializeDocs({ ...snapshot, revision });
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DOCS_FILE, json);
  console.error(
    `docs-data: ${snapshot.pages.length} pages, ${snapshot.chunks.length} chunks, ${Math.round(json.length / 1024)} KB`,
  );
}

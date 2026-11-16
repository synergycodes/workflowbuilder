import { mkdir, writeFile } from 'node:fs/promises';

import { BUILD_FILE, DATA_DIR } from '../src/paths.js';
import { gitHead } from './git-head.js';

// The commit tsc compiled: docs-data and typedoc refresh dist/data alone, so their stamps cannot vouch for dist/*.js.
await mkdir(DATA_DIR, { recursive: true });
await writeFile(BUILD_FILE, `${JSON.stringify({ revision: gitHead() }, undefined, 2)}\n`);

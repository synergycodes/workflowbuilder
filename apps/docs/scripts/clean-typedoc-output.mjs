import { rmSync } from 'node:fs';
import path from 'node:path';

import { UI_API_REFERENCE_DIRECTORY } from '../src/ui-api-reference.mjs';

const TYPEDOC_OUTPUT_DIRECTORIES = ['api', UI_API_REFERENCE_DIRECTORY];
const contentRoot = path.resolve(import.meta.dirname, '../src/content/docs');

for (const outputDirectory of TYPEDOC_OUTPUT_DIRECTORIES) {
  rmSync(path.join(contentRoot, outputDirectory), { recursive: true, force: true });
}

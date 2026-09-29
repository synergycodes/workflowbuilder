import { rmSync } from 'node:fs';
import path from 'node:path';

const contentRoot = path.resolve(import.meta.dirname, '../src/content/docs');

for (const outputDirectory of ['api', 'ui-api']) {
  rmSync(path.join(contentRoot, outputDirectory), { recursive: true, force: true });
}

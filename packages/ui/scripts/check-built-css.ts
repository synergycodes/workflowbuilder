import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { checkStylesheet } from './check-stylesheet';

const packageDirectory = path.resolve(import.meta.dirname, '..');

// Public defaults are this package's to declare; a consumer bundle (the SDK) may set a public
// variable on its own subtree as a scoped override. Every other rule applies to both.
const directories = [
  { path: path.join(packageDirectory, 'dist'), ownsPublicDefaults: true },
  ...process.argv.slice(2).map((item) => ({ path: path.resolve(item), ownsPublicDefaults: false })),
];

const problems = directories.flatMap(({ path: directory, ownsPublicDefaults }) =>
  globSync('**/*.css', { cwd: directory }).flatMap((relativeFile) => {
    const from = path.join(directory, relativeFile);
    return checkStylesheet(readFileSync(from, 'utf8'), { from, directory, ownsPublicDefaults });
  }),
);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}

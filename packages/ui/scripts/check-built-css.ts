import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { checkStylesheet } from './check-stylesheet';

const packageDirectory = path.resolve(import.meta.dirname, '..');

// This package's dist is the UI bundle; a directory passed as an argument is a consumer bundle (the SDK).
const directories = [
  { path: path.join(packageDirectory, 'dist'), bundle: 'ui' as const },
  ...process.argv.slice(2).map((item) => ({ path: path.resolve(item), bundle: 'sdk' as const })),
];

const problems = directories.flatMap(({ path: directory, bundle }) =>
  globSync('**/*.css', { cwd: directory }).flatMap((relativeFile) => {
    const from = path.join(directory, relativeFile);
    return checkStylesheet(readFileSync(from, 'utf8'), { from, directory, bundle });
  }),
);

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}

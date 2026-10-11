import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

import { PACKAGE_ROOT, REPO_ROOT } from '../src/paths.js';
import { TYPEDOC_FLAGS } from '../src/typedoc-runs.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const rootRequire = createRequire(path.join(REPO_ROOT, 'package.json'));

const fixtureRoot = path.join(PACKAGE_ROOT, 'src/__fixtures__');
const sourceRoot = path.join(fixtureRoot, 'typedoc-src');
const outputRoot = path.join(fixtureRoot, 'typedoc');

const RUNS: { name: string; entryPoints: string[] }[] = [
  { name: 'alpha', entryPoints: ['alpha/index.ts'] },
  { name: 'alpha.referenced', entryPoints: ['alpha/hidden.ts'] },
  { name: 'beta', entryPoints: ['beta/index.ts'] },
  { name: 'multi', entryPoints: ['multi/index.ts', 'multi/client.ts', 'multi/workflow.ts'] },
];

const typedocBin = path.resolve(path.dirname(require.resolve('typedoc/package.json')), 'bin/typedoc');
const prettierBin = rootRequire.resolve('prettier/bin/prettier.cjs');

await mkdir(outputRoot, { recursive: true });
const outputs: string[] = [];
for (const run of RUNS) {
  const output = path.join(outputRoot, `${run.name}.json`);
  outputs.push(output);
  await execFileAsync(
    process.execPath,
    [
      typedocBin,
      '--json',
      output,
      ...run.entryPoints.flatMap((entry) => ['--entryPoints', entry]),
      '--tsconfig',
      'tsconfig.json',
      '--basePath',
      '.',
      '--disableGit',
      '--sourceLinkTemplate',
      'https://example.test/blob/fixture/src/{path}#L{line}',
      ...TYPEDOC_FLAGS,
    ],
    { cwd: sourceRoot },
  );
}
await execFileAsync(process.execPath, [prettierBin, '--write', '--log-level', 'silent', ...outputs], {
  cwd: REPO_ROOT,
});
console.error(`fixtures: wrote ${outputs.length} TypeDoc files to ${outputRoot}`);

import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

import { DATA_DIR, MANIFEST_FILE, REPO_ROOT, TYPEDOC_DIR } from '../src/paths.js';
import { type ExternalTupleValues, inlineConstTupleIndexes } from '../src/symbols/const-tuples.js';
import { unresolvedTargets } from '../src/symbols/referenced-types.js';
import { type TypedocReflection, topLevelCount } from '../src/symbols/typedoc-types.js';
import { TYPEDOC_FLAGS, TYPEDOC_RUNS, type TypedocRun } from '../src/typedoc-runs.js';
import { createTupleValueReader } from './const-tuple-values.js';
import { gitHead } from './git-head.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

interface TypedocPackage {
  version: string;
  bin: string | Record<string, string>;
}

async function typedocBin() {
  const packageJsonPath = require.resolve('typedoc/package.json');
  const metadata = JSON.parse(await readFile(packageJsonPath, 'utf8')) as TypedocPackage;
  const bin = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin.typedoc;
  return { binPath: path.resolve(path.dirname(packageJsonPath), bin), version: metadata.version };
}

async function runTypedoc(
  binPath: string,
  run: TypedocRun,
  entryPoints: readonly string[] = run.entryPoints,
  suffix = '',
) {
  const output = path.resolve(TYPEDOC_DIR, `${run.packageName}${suffix}.json`);
  const entryArguments = entryPoints.flatMap((entry) => ['--entryPoints', entry]);
  // The JS bin run through node avoids the .bin shell shim, which execFile cannot launch on Windows.
  await execFileAsync(
    process.execPath,
    [binPath, '--json', output, ...entryArguments, '--tsconfig', run.tsconfig, ...TYPEDOC_FLAGS],
    { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 },
  );
  return output;
}

// Types a package references without exporting are absent from its main run. Documenting the files that
// declare them (and, repeatedly, the files those reference) lets the server expand aliases of them.
const MAX_REFERENCED_ROUNDS = 3;

async function runReferencedTypedoc(binPath: string, run: TypedocRun, project: TypedocReflection) {
  await rm(path.resolve(TYPEDOC_DIR, `${run.packageName}.referenced.json`), { force: true });
  const packageRoot = path.dirname(run.tsconfig);
  const files = new Set<string>();
  let current = project;
  for (let round = 0; round < MAX_REFERENCED_ROUNDS; round++) {
    const before = files.size;
    for (const target of unresolvedTargets(current)) files.add(path.posix.join(packageRoot, target.packagePath));
    if (files.size === before) return;
    const output = await runTypedoc(binPath, run, [...files], '.referenced');
    current = JSON.parse(await readFile(output, 'utf8')) as TypedocReflection;
  }
}

// After the referenced run, which still needs the original queries to find the files they point into.
async function inlineTupleIndexes(run: TypedocRun, tupleValues: ExternalTupleValues) {
  let rewritten = 0;
  for (const suffix of ['', '.referenced']) {
    const file = path.resolve(TYPEDOC_DIR, `${run.packageName}${suffix}.json`);
    const project = JSON.parse(await readFile(file, 'utf8').catch(() => 'null')) as TypedocReflection | null;
    if (!project) continue;
    const count = inlineConstTupleIndexes(project, tupleValues);
    if (count > 0) await writeFile(file, JSON.stringify(project));
    rewritten += count;
  }
  return rewritten;
}

async function main() {
  await mkdir(TYPEDOC_DIR, { recursive: true });
  const { binPath, version } = await typedocBin();
  const outputs = await Promise.all(TYPEDOC_RUNS.map((run) => runTypedoc(binPath, run)));
  const tupleValues = createTupleValueReader();

  const packages: Record<string, number> = {};
  const versions: Record<string, string> = {};
  const inlined: Record<string, number> = {};
  for (const [index, run] of TYPEDOC_RUNS.entries()) {
    const project = JSON.parse(await readFile(outputs[index], 'utf8'));
    packages[run.packageName] = topLevelCount(project, run.entryPoints.length > 1);
    await runReferencedTypedoc(binPath, run, project);
    inlined[run.packageName] = await inlineTupleIndexes(run, tupleValues);
    const packageJson = path.resolve(REPO_ROOT, path.dirname(run.tsconfig), 'package.json');
    versions[run.packageName] = (JSON.parse(await readFile(packageJson, 'utf8')) as { version: string }).version;
  }

  const manifest = {
    builtAt: new Date().toISOString(),
    gitHead: gitHead() ?? 'unknown',
    typedocVersion: version,
    packages,
    versions,
  };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, undefined, 2) + '\n');
  console.error(
    `typedoc: ${JSON.stringify(packages)} ${JSON.stringify(versions)}, tuple types inlined ${JSON.stringify(inlined)} (typedoc ${version})`,
  );
}

await main();

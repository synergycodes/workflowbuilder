#!/usr/bin/env node
// Consumes the pending changesets of the named package(s) and nothing else. Changesets
// has no "only this package" mode: `changeset version` bumps every package with a pending
// changeset, so releasing one package would land an unpublished version bump of its
// siblings on `release`. This wrapper computes the complementary `--ignore` list from the
// workspace so nobody types it from memory.
//
// Run with `pnpm release:version <package> [<package>…]` on a release branch cut from
// main, e.g. `pnpm release:version temporal`. Names may be short (`temporal`) or full
// (`@workflowbuilder/temporal`). `--dry-run` prints the plan and changes nothing.
// Procedure: packages/RELEASE.md.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@workflowbuilder/';
const USAGE = 'Usage: pnpm release:version <package> [<package>…] [--dry-run]   e.g. pnpm release:version temporal';

const require = createRequire(import.meta.url);
const CHANGESET_BIN = path.join(path.dirname(require.resolve('@changesets/cli/package.json')), 'bin.js');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// shell: true on Windows so `pnpm.cmd` resolves. Package names reach the command line
// only after they matched a workspace package, so nothing user-typed is passed through.
function run(command, commandArguments, options = {}) {
  const result = spawnSync(command, commandArguments, {
    cwd: ROOT,
    encoding: 'utf8',
    // Only for commands looked up on PATH: an absolute path (process.execPath) may contain spaces.
    shell: process.platform === 'win32' && !path.isAbsolute(command),
    ...options,
  });
  if (result.error) fail(`${command} ${commandArguments.join(' ')} failed to start: ${result.error.message}`);
  return result;
}

const fullName = (name) => (name.startsWith('@') ? name : SCOPE + name);
const shortName = (name) => (name.startsWith(SCOPE) ? name.slice(SCOPE.length) : name);

function currentBranch() {
  return run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
}

function workspacePackages() {
  const { status, stdout, stderr } = run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']);
  if (status !== 0) fail(`pnpm -r ls failed:\n${stderr}`);
  return JSON.parse(stdout);
}

// The release plan Changesets would apply right now, keyed by package name.
function pendingReleases() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'wb-release-'));
  const file = path.join(directory, 'status.json');
  try {
    const { status, stderr } = run(process.execPath, [CHANGESET_BIN, 'status', '--output', file]);
    if (status !== 0) fail(`changeset status failed:\n${stderr}`);
    const { releases } = JSON.parse(readFileSync(file, 'utf8'));
    return new Map(releases.filter((r) => r.changesets.length > 0).map((r) => [r.name, r]));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const unknownFlags = argv.filter((a) => a.startsWith('--') && a !== '--dry-run');
if (unknownFlags.length > 0) fail(`Unknown option ${unknownFlags.join(', ')}\n${USAGE}`);
const targets = [...new Set(argv.filter((a) => !a.startsWith('--')).map(fullName))];
if (targets.length === 0) fail(USAGE);

const publishable = workspacePackages().filter((p) => p.private !== true);
const publishableNames = publishable.map((p) => p.name);
for (const target of targets) {
  if (!publishableNames.includes(target)) {
    fail(`${target} is not a publishable workspace package. Publishable: ${publishableNames.join(', ')}`);
  }
}
const ignore = publishableNames.filter((name) => !targets.includes(name));

const branch = currentBranch();
if (!dryRun && (branch === 'main' || branch === 'release')) {
  fail(`You are on ${branch}. Cut a release branch first: git checkout -b release/${shortName(targets[0])}-X.Y.Z`);
}

const pending = pendingReleases();
for (const target of targets) {
  if (!pending.has(target)) fail(`${target} has no pending changesets. Nothing to release.`);
}

console.log('Will version:');
for (const target of targets) {
  const { oldVersion, newVersion, type, changesets } = pending.get(target);
  const count = `${changesets.length} changeset${changesets.length === 1 ? '' : 's'}`;
  console.log(`  ${target}  ${oldVersion} -> ${newVersion}  (${type}, ${count})`);
}
console.log('Will leave untouched (their changesets stay in .changeset/):');
for (const name of ignore) {
  console.log(`  ${name}  (${pending.get(name)?.changesets.length ?? 0} pending)`);
}
if (ignore.length === 0) console.log('  (none: every publishable package is being released)');

if (dryRun) {
  console.log('\nDry run. No files changed.');
  process.exit(0);
}

const ignoreFlags = ignore.flatMap((name) => ['--ignore', name]);
const { status } = run(process.execPath, [CHANGESET_BIN, 'version', ...ignoreFlags], { stdio: 'inherit' });
if (status !== 0) fail('changeset version failed. Nothing was committed; inspect `git status` and `git diff`.');

const released = targets.map((name) => {
  const { path: directory } = publishable.find((p) => p.name === name);
  const { version } = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  return { name, short: shortName(name), directory: path.relative(ROOT, directory), version };
});
const commitMessage =
  released.length === 1
    ? `chore(${released[0].short}): release ${released[0].version}`
    : `chore(release): ${released.map((r) => `${r.short} ${r.version}`).join(', ')}`;

console.log('\nDone. Next steps:');
for (const r of released) {
  console.log(
    `  - Rewrite the new section in ${r.directory}/CHANGELOG.md into Keep a Changelog form (packages/RELEASE.md § "Reformat the generated CHANGELOG section").`,
  );
}
console.log(`  - git add -A && git commit -m "${commitMessage}"`);
console.log('  - Open a PR into `release`. Once it is merged, tag from the release head:');
for (const r of released) {
  console.log(`      pnpm release:tag ${r.short}    # creates and pushes ${r.name}@${r.version}`);
}

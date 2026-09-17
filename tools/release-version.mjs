#!/usr/bin/env node
// Bumps the package(s) you name from their pending changesets and leaves every other
// package alone. Changesets has no "only this package" mode: bare `changeset version`
// bumps everything that has a pending changeset, so this script passes `--ignore` for
// every publishable package you did not name.
//
//   pnpm release:version temporal              bump @workflowbuilder/temporal
//   pnpm release:version sdk ui                bump both, as one release
//   pnpm release:version temporal --dry-run    print the plan, change nothing
//
// Full procedure: packages/RELEASE.md.
import { readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { ROOT, fail, fullName, parseCommandLine, run, shortName, workspacePackages } from './release-shared.mjs';

const USAGE = 'Usage: pnpm release:version <package> [<package>…] [--dry-run]';
const CHANGESET_PACKAGE = createRequire(import.meta.url).resolve('@changesets/cli/package.json');
const changeset = (changesetArguments, options) =>
  run(process.execPath, [path.join(path.dirname(CHANGESET_PACKAGE), 'bin.js'), ...changesetArguments], options);

// ---------- Arguments ----------

const { values: flags, positionals } = parseCommandLine({ 'dry-run': { type: 'boolean' } }, USAGE);
if (positionals.length === 0) fail(USAGE);
const dryRun = flags['dry-run'] === true;
const targets = [...new Set(positionals.map(fullName))];

// ---------- Which packages are in, which stay out ----------

const publishable = workspacePackages().filter((p) => p.private !== true);
const publishableNames = publishable.map((p) => p.name);
const unknown = targets.filter((name) => !publishableNames.includes(name));
if (unknown.length > 0) {
  fail(`Not a publishable package: ${unknown.join(', ')}. Publishable: ${publishableNames.join(', ')}`);
}
const ignore = publishableNames.filter((name) => !targets.includes(name));

// ---------- Guards ----------

// A version bump belongs on a release branch, never directly on main or release.
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
if (!dryRun && ['main', 'release'].includes(branch)) {
  fail(`You are on ${branch}. Cut a release branch first: git checkout -b release/${shortName(targets[0])}-X.Y.Z`);
}

// What Changesets would do right now. `--output` is the only way to get that as JSON.
const planFile = path.join(os.tmpdir(), `wb-release-plan-${process.pid}.json`);
const status = changeset(['status', '--output', planFile]);
if (status.status !== 0) fail(`changeset status failed:\n${status.stderr}`);
const plan = JSON.parse(readFileSync(planFile, 'utf8')).releases.filter((r) => r.changesets.length > 0);
rmSync(planFile, { force: true });
const pendingFor = (name) => plan.find((r) => r.name === name);

const idle = targets.filter((name) => !pendingFor(name));
if (idle.length > 0) fail(`No pending changesets for ${idle.join(', ')}. Nothing to release.`);

// ---------- Plan ----------

console.log('Will version:');
for (const name of targets) {
  const { oldVersion, newVersion, type, changesets } = pendingFor(name);
  const count = `${changesets.length} changeset${changesets.length === 1 ? '' : 's'}`;
  console.log(`  ${name}  ${oldVersion} -> ${newVersion}  (${type}, ${count})`);
}
console.log('Will leave untouched (their changesets stay in .changeset/):');
for (const name of ignore) console.log(`  ${name}  (${pendingFor(name)?.changesets.length ?? 0} pending)`);
if (ignore.length === 0) console.log('  (none: every publishable package is being released)');

if (dryRun) {
  console.log('\nDry run. No files changed.');
  process.exit(0);
}

// ---------- Version ----------

const ignoreFlags = ignore.flatMap((name) => ['--ignore', name]);
if (changeset(['version', ...ignoreFlags], { stdio: 'inherit' }).status !== 0) {
  fail('changeset version failed. Nothing is committed; check `git status` and `git diff`.');
}

// ---------- Next steps ----------

const released = targets.map((name) => {
  const directory = publishable.find((p) => p.name === name).path;
  const { version } = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  return { name, short: shortName(name), directory: path.relative(ROOT, directory), version };
});
const commitMessage =
  released.length === 1
    ? `chore(${released[0].short}): release ${released[0].version}`
    : `chore(release): ${released.map((r) => `${r.short} ${r.version}`).join(', ')}`;

console.log('\nDone. Next steps:');
for (const r of released) {
  console.log(`  - Rewrite the new section in ${r.directory}/CHANGELOG.md into Keep a Changelog form`);
  console.log('    (packages/RELEASE.md § "Reformat the generated CHANGELOG section").');
}
console.log(`  - git add -A && git commit -m "${commitMessage}"`);
console.log('  - Open a PR into `release`. Once it is merged, tag from the release head:');
for (const r of released)
  console.log(`      pnpm release:tag ${r.short}    # creates and pushes ${r.name}@${r.version}`);

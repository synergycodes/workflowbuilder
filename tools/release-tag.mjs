#!/usr/bin/env node
// Creates and pushes the release tag for one package. Pushing the tag is the release:
// .github/workflows/release-<pkg>.yml runs on it. Everything before the push is a check
// that the tag would land on the right commit with the right release notes.
//
//   pnpm release:tag temporal              check, ask, tag, push
//   pnpm release:tag temporal --dry-run    check only
//   pnpm release:tag temporal --yes        skip the confirmation prompt
//
// Run from a checkout of `release`. Full procedure: packages/RELEASE.md.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import {
  ROOT,
  changelogHasVersion,
  fail,
  fullName,
  parseCommandLine,
  run,
  shortName,
  workspacePackages,
} from './release-shared.mjs';

const USAGE = 'Usage: pnpm release:tag <package> [--dry-run] [--yes]';
const git = (gitArguments, options) => run('git', gitArguments, options);
const gitOut = (...gitArguments) => git(gitArguments).stdout.trim();

// Each check prints its own line. Any failure means no tag.
let failures = 0;
function check(ok, label, hint) {
  console.log(ok ? `✅ ${label}` : `❌ ${label}  (${hint})`);
  if (!ok) failures += 1;
}

// Yes/no question on the terminal. Without a terminal the caller has to pass --yes.
async function confirm(question) {
  if (!process.stdin.isTTY) fail('No terminal to confirm in. Re-run with --yes to skip the prompt.');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  const reply = await prompt.question(question);
  prompt.close();
  return ['y', 'yes'].includes(reply.trim().toLowerCase());
}

// ---------- Arguments ----------

const options = { 'dry-run': { type: 'boolean' }, yes: { type: 'boolean' } };
const { values: flags, positionals } = parseCommandLine(options, USAGE);
if (positionals.length !== 1) fail(USAGE);
const name = fullName(positionals[0]);
const short = shortName(name);

// ---------- The package and its tag ----------

const workspacePackage = workspacePackages().find((p) => p.name === name);
if (!workspacePackage) fail(`${name} is not a workspace package.`);
if (workspacePackage.private === true) fail(`${name} is private, so it is never published or tagged.`);

const { version } = JSON.parse(readFileSync(path.join(workspacePackage.path, 'package.json'), 'utf8'));
const tag = `${name}@${version}`;
const workflow = `.github/workflows/release-${short}.yml`;
const changelog = path.join(workspacePackage.path, 'CHANGELOG.md');

// ---------- Checks ----------

if (git(['fetch', 'origin', 'release', '--quiet']).status !== 0)
  fail('git fetch origin release failed. Are you online?');
const head = gitOut('rev-parse', 'HEAD');
const releaseHead = gitOut('rev-parse', 'origin/release');
check(
  head === releaseHead,
  `HEAD ${head.slice(0, 8)} is the tip of origin/release`,
  `origin/release is at ${releaseHead.slice(0, 8)}: merge the release PR, then git checkout release && git pull`,
);

check(
  gitOut('status', '--porcelain', '--untracked-files=no') === '',
  'working tree has no uncommitted changes',
  'commit or stash first',
);

// An unreadable origin must not pass for "no such tag": pushing an existing tag exits 0 and starts nothing.
const remoteTag = git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
if (remoteTag.status !== 0) fail('Could not read tags from origin. Check the connection and re-run.');
const tagExists = gitOut('tag', '-l', tag) !== '' || remoteTag.stdout.trim() !== '';
check(!tagExists, `tag ${tag} does not exist yet`, 'it already exists locally or on origin');

check(existsSync(path.join(ROOT, workflow)), `${workflow} exists`, 'no workflow listens for this tag');

const hasNotes = existsSync(changelog) && changelogHasVersion(readFileSync(changelog, 'utf8'), version);
check(hasNotes, `CHANGELOG.md has a section for ${version}`, 'the GitHub Release would have no notes');

// Informational only. The workflow is idempotent: a version already on npm (the hand-made
// first publish, or a re-run) gets its GitHub Release and no second publish.
const view = run('npm', ['view', tag, 'version']);
const onNpm = view.status === 0 && view.stdout.trim() !== '';
console.log(
  onNpm
    ? `ℹ️  ${tag} is already on npm: the workflow will skip publish and only create the GitHub Release.`
    : `ℹ️  ${tag} is not on npm: the workflow will publish it.`,
);

if (failures > 0) fail('Not tagging.');

// ---------- Tag and push ----------

console.log(`\nPlan: git tag ${tag} && git push origin ${tag}`);
if (flags['dry-run']) {
  console.log('Dry run. Nothing tagged.');
  process.exit(0);
}

const consequence = onNpm ? 'creates the GitHub Release' : 'publishes to npm';
if (!flags.yes && !(await confirm(`Create and push ${tag}? This ${consequence}. [y/N] `))) {
  console.log('Aborted. Nothing tagged.');
  process.exit(0);
}

if (git(['tag', tag]).status !== 0) fail(`git tag ${tag} failed.`);
// --no-verify: the repo's pre-push hook runs `prettier --write` over the whole tree, which has no
// place in the middle of a release. The clean-tree check above already ran.
const push = git(['push', '--no-verify', 'origin', `refs/tags/${tag}`], { stdio: 'inherit' });

// Read the result back from origin instead of trusting the exit code: a dropped connection can
// fail the push after the server accepted the ref, and then the release workflow is already running.
const landed = git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
if (landed.status !== 0) {
  fail(
    `Could not read origin after the push (git push exit ${push.status}). Check the tag on GitHub before re-running; the local tag ${tag} is kept.`,
  );
}
if (landed.stdout.trim() === '') {
  git(['tag', '-d', tag]);
  fail(`${tag} is not on origin (git push exit ${push.status}). Local tag removed; nothing published.`);
}
if (push.status !== 0)
  console.log(`⚠️  git push reported an error, but ${tag} is on origin: the release workflow is running.`);

console.log(`\n🚀 Pushed ${tag}.`);
const remote = gitOut('remote', 'get-url', 'origin').match(/github\.com[:/](.+?)(?:\.git)?$/);
if (remote) console.log(`Watch: https://github.com/${remote[1]}/actions/workflows/release-${short}.yml`);
console.log('When it is green: git checkout main && git pull && git merge release && git push origin main');

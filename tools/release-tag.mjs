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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

import {
  ROOT,
  changelogHasNotes,
  fail,
  fullName,
  npmVersionState,
  parseCommandLine,
  remoteRefSha,
  run,
  shortName,
  workspacePackages,
} from './release-shared.mjs';

const USAGE = 'Usage: pnpm release:tag <package> [--dry-run] [--yes]';
const git = (gitArguments, options) => run('git', gitArguments, options);
// A git failure stops the script. Read as an empty string it would pass for "clean tree" or "no tag".
const gitOut = (...gitArguments) => {
  const result = git(gitArguments);
  if (result.status !== 0) fail(`git ${gitArguments.join(' ')} failed:\n${result.stderr.trim()}`);
  return result.stdout.trim();
};

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
const changelog = path.relative(ROOT, path.join(workspacePackage.path, 'CHANGELOG.md')).split(path.sep).join('/');

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

check(
  git(['cat-file', '-e', `HEAD:${workflow}`]).status === 0,
  `${workflow} exists at HEAD`,
  'no workflow listens for this tag on the tagged commit',
);

// Read from the commit that will carry the tag, not from the disk: an untracked CHANGELOG passes
// the clean-tree check above and would leave the tagged commit with no notes to publish.
const changelogAtHead = git(['show', `HEAD:${changelog}`]);
const hasNotes = changelogAtHead.status === 0 && changelogHasNotes(changelogAtHead.stdout, version);
check(hasNotes, `${changelog} at HEAD has notes for ${version}`, 'no section, or a heading with nothing under it');

// Informational only. The workflow is idempotent: a version already on npm (the hand-made
// first publish, or a re-run) gets its GitHub Release and no second publish.
// npm answers three ways: the version (published), nothing (package exists, version does not), or an
// error. Only E404 in the error means "no such package"; anything else means npm could not be asked.
const view = run('npm', ['view', tag, 'version']);
const npmState = npmVersionState(view);
const onNpm = npmState === 'published';
if (npmState === 'published')
  console.log(`ℹ️  ${tag} is already on npm: the workflow will skip publish and only create the GitHub Release.`);
if (npmState === 'absent') console.log(`ℹ️  ${tag} is not on npm: the workflow will publish it.`);
if (npmState === 'unknown') {
  const reason =
    view.stderr
      .trim()
      .split('\n')
      .find((line) => line.includes('npm error')) ?? view.stderr.trim().split('\n')[0];
  console.log(
    `⚠️  Could not check npm (${reason}). The workflow decides at run time: it publishes unless ${tag} is already there.`,
  );
}

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
const landedSha = remoteRefSha(landed.stdout);
if (landedSha === undefined) {
  git(['tag', '-d', tag]);
  fail(`${tag} is not on origin (git push exit ${push.status}). Local tag removed; nothing published.`);
}
// On origin is not enough: between the pre-check and the push someone else may have pushed the same
// name onto another commit. Then our push was rejected and it is their release that is running.
if (landedSha !== head) {
  fail(
    `${tag} on origin points at ${landedSha.slice(0, 8)}, not at HEAD ${head.slice(0, 8)} (git push exit ${push.status}). ` +
      `Someone else pushed this tag; nothing of yours was released. The local tag is kept: inspect it, then git tag -d ${tag}.`,
  );
}
if (push.status !== 0)
  console.log(`⚠️  git push reported an error, but ${tag} is on origin at HEAD: the release workflow is running.`);

console.log(`\n🚀 Pushed ${tag}.`);
const remote = git(['remote', 'get-url', 'origin'])
  .stdout.trim()
  .match(/github\.com[:/](.+?)(?:\.git)?$/);
if (remote) console.log(`Watch: https://github.com/${remote[1]}/actions/workflows/release-${short}.yml`);
console.log('When it is green: git checkout main && git pull && git merge release && git push origin main');

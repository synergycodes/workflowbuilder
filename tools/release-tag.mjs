#!/usr/bin/env node
// Creates and pushes the release tag for one package, by name. Pushing that tag is the
// release: `.github/workflows/release-<package>.yml` runs on it, and nothing else in the
// repo creates these tags. Before touching git it checks that HEAD is the tip of
// `release`, that the version in package.json has a CHANGELOG section and no tag yet,
// and reports whether the version is already on npm (then the workflow only creates the
// GitHub Release).
//
// Run with `pnpm release:tag <package>` from a checkout of `release`, e.g.
// `pnpm release:tag temporal`. `--dry-run` runs the checks and stops; `--yes` skips the
// confirmation prompt. Procedure: packages/RELEASE.md.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@workflowbuilder/';
const RELEASE_BRANCH = 'release';
const USAGE = 'Usage: pnpm release:tag <package> [--dry-run] [--yes]   e.g. pnpm release:tag temporal';

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

// shell: true on Windows so `pnpm.cmd` / `npm.cmd` resolve. The package name reaches the
// command line only after it matched a workspace package.
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

const git = (gitArguments, options) => run('git', gitArguments, options);
const gitOut = (...gitArguments) => git(gitArguments).stdout.trim();

const fullName = (name) => (name.startsWith('@') ? name : SCOPE + name);
const shortName = (name) => (name.startsWith(SCOPE) ? name.slice(SCOPE.length) : name);

function repoWebUrl() {
  const match = gitOut('remote', 'get-url', 'origin').match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match ? `https://github.com/${match[1]}` : undefined;
}

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const yes = argv.includes('--yes');
const unknownFlags = argv.filter((a) => a.startsWith('--') && !['--dry-run', '--yes'].includes(a));
if (unknownFlags.length > 0) fail(`Unknown option ${unknownFlags.join(', ')}\n${USAGE}`);
const names = argv.filter((a) => !a.startsWith('--'));
if (names.length !== 1) fail(USAGE);
const name = fullName(names[0]);
const short = shortName(name);

const ls = run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']);
if (ls.status !== 0) fail(`pnpm -r ls failed:\n${ls.stderr}`);
const workspacePackage = JSON.parse(ls.stdout).find((p) => p.name === name);
if (!workspacePackage) fail(`${name} is not a workspace package.`);
if (workspacePackage.private === true) fail(`${name} is private: it is not published, so it is not tagged.`);

const { version } = JSON.parse(readFileSync(path.join(workspacePackage.path, 'package.json'), 'utf8'));
const tag = `${name}@${version}`;
const workflow = `.github/workflows/release-${short}.yml`;

const checks = [];
const check = (ok, label, detail = '') => checks.push({ ok, label, detail: ok ? '' : detail });

if (git(['fetch', 'origin', RELEASE_BRANCH, '--quiet']).status !== 0) {
  fail(`git fetch origin ${RELEASE_BRANCH} failed. Are you online?`);
}
const head = gitOut('rev-parse', 'HEAD');
const releaseHead = gitOut('rev-parse', `origin/${RELEASE_BRANCH}`);
check(
  head === releaseHead,
  `HEAD ${head.slice(0, 8)} is the tip of origin/${RELEASE_BRANCH}`,
  `origin/${RELEASE_BRANCH} is at ${releaseHead.slice(0, 8)}. Merge the release PR first, then git checkout ${RELEASE_BRANCH} && git pull.`,
);

const dirty = gitOut('status', '--porcelain', '--untracked-files=no');
check(dirty === '', 'working tree has no uncommitted changes', `${dirty.split('\n').length} modified file(s)`);

const localTag = gitOut('tag', '-l', tag);
const remoteTag = gitOut('ls-remote', '--tags', 'origin', `refs/tags/${tag}`);
check(
  localTag === '' && remoteTag === '',
  `tag ${tag} does not exist yet`,
  remoteTag ? 'exists on origin' : 'exists locally',
);

check(existsSync(path.join(ROOT, workflow)), `${workflow} exists`, 'no workflow listens for this tag');

const changelogPath = path.join(workspacePackage.path, 'CHANGELOG.md');
const escapedVersion = version.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const versionHeading = new RegExp(`^## \\[?${escapedVersion}\\]?([ -]|$)`, 'm');
const hasNotes = existsSync(changelogPath) && versionHeading.test(readFileSync(changelogPath, 'utf8'));
check(
  hasNotes,
  `${path.relative(ROOT, changelogPath)} has a section for ${version}`,
  'the GitHub Release would have no notes',
);

for (const c of checks) console.log(`${c.ok ? '✅' : '❌'} ${c.label}${c.detail ? `  (${c.detail})` : ''}`);

// Informational: the workflow is idempotent, so a version that is already on npm
// (the hand-published first release, or a re-run) only gets its GitHub Release.
const view = run('npm', ['view', tag, 'version']);
const onNpm = view.status === 0 && view.stdout.trim() !== '';
console.log(
  onNpm
    ? `ℹ️  ${tag} is already on npm: the workflow will skip publish and only create the GitHub Release.`
    : `ℹ️  ${tag} is not on npm: the workflow will publish it.`,
);

if (checks.some((c) => !c.ok)) fail('Not tagging.');

console.log(`\nPlan: git tag ${tag} && git push origin ${tag}`);
if (dryRun) {
  console.log('Dry run. Nothing tagged.');
  process.exit(0);
}

if (!yes) {
  if (!process.stdin.isTTY) fail('No terminal to confirm in. Re-run with --yes to skip the prompt.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const consequence = onNpm ? 'creates the GitHub Release' : 'publishes to npm';
  const reply = await rl.question(`Create and push ${tag}? This ${consequence}. [y/N] `);
  const answer = reply.trim().toLowerCase();
  rl.close();
  if (answer !== 'y' && answer !== 'yes') {
    console.log('Aborted. Nothing tagged.');
    process.exit(0);
  }
}

if (git(['tag', tag]).status !== 0) fail(`git tag ${tag} failed.`);
if (git(['push', 'origin', `refs/tags/${tag}`], { stdio: 'inherit' }).status !== 0) {
  git(['tag', '-d', tag]);
  fail(`git push failed. Local tag ${tag} removed; nothing published.`);
}

console.log(`\n🚀 Pushed ${tag}.`);
const web = repoWebUrl();
if (web) console.log(`Watch: ${web}/actions/workflows/release-${short}.yml`);
console.log(`When it is green: git checkout main && git pull && git merge ${RELEASE_BRANCH} && git push origin main`);

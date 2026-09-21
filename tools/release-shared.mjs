// Shared by the release scripts (release-version, release-tag, release-notes): the plumbing all
// of them need, plus the two rules the release workflows depend on: which CHANGELOG section
// belongs to a version, and what an `npm view` answer means.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@workflowbuilder/';

// Every refusal in the release scripts ends here: print the reason, exit 1.
export function fail(message) {
  console.error(`❌ ${message}`);
  // eslint-disable-next-line unicorn/no-process-exit -- the release scripts are CLIs and this is their one exit path
  process.exit(1);
}

// Run a command from the repo root and capture its output. A shell is used only for
// commands looked up on PATH, so `pnpm.cmd` resolves on Windows while an absolute
// path with spaces (process.execPath) is never split by one.
export function run(command, commandArguments, options = {}) {
  const result = spawnSync(command, commandArguments, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32' && !path.isAbsolute(command),
    ...options,
  });
  if (result.error) fail(`${command} failed to start: ${result.error.message}`);
  return result;
}

// `--dry-run`-style flags plus positionals; an unknown flag prints the usage line.
export function parseCommandLine(options, usage) {
  try {
    return parseArgs({ options, allowPositionals: true });
  } catch (error) {
    return fail(`${error.message}\n${usage}`);
  }
}

// `temporal` and `@workflowbuilder/temporal` name the same package on the command line.
export const fullName = (name) => (name.startsWith('@') ? name : SCOPE + name);
export const shortName = (name) => (name.startsWith(SCOPE) ? name.slice(SCOPE.length) : name);

// Every workspace package as pnpm sees it: name, version, path, private.
export function workspacePackages() {
  const { status, stdout, stderr } = run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']);
  if (status !== 0) fail(`pnpm -r ls failed:\n${stderr}`);
  return JSON.parse(stdout);
}

// The GitHub Release body is the CHANGELOG section for the version: everything between the
// heading whose version token, brackets stripped, equals the version exactly, and the next
// `## ` heading. `## 1.2.3` and `## [1.2.3] - 2026-06-16` count, `## 1.2.3-beta.1` does not.
// Undefined when there is no such heading; an empty string when the heading has no body.
export function changelogSection(markdown, version) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => headingVersion(line) === version);
  if (start === -1) return;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

// A release needs notes, so the heading alone does not count.
export function changelogHasNotes(markdown, version) {
  return (changelogSection(markdown, version) ?? '') !== '';
}

function headingVersion(line) {
  if (!line.startsWith('## ')) return;
  const token = line.slice(3).trim().split(/\s+/)[0] ?? '';
  return token.replace(/^\[/, '').replace(/\]$/, '');
}

// What `npm view <pkg>@<version> version` said. E404 is npm's answer for both "no such package"
// and "no such version"; any other failure means npm could not be asked, which is not "absent".
export function npmVersionState({ status, stdout, stderr }) {
  if (status === 0) return stdout.trim() === '' ? 'absent' : 'published';
  return stderr.includes('E404') ? 'absent' : 'unknown';
}

// `git ls-remote --tags origin refs/tags/<tag>` prints `<sha>\trefs/tags/<tag>`. For a lightweight
// tag the sha is the commit itself; an annotated tag would need `refs/tags/<tag>^{}` to get there.
export function remoteRefSha(lsRemoteOutput) {
  const line = lsRemoteOutput.trim().split('\n')[0] ?? '';
  return line === '' ? undefined : line.split(/\s+/)[0];
}

// Shared by release-version.mjs and release-tag.mjs. Nothing here is release logic,
// only the plumbing both scripts need: stop with a message, run a command, name a package.
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

// The GitHub Release body is the CHANGELOG section for the version, and release:tag refuses
// without one. A heading counts when its version token, brackets stripped, equals the
// version exactly: `## 1.2.3` and `## [1.2.3] - 2026-06-16` do, `## 1.2.3-beta.1` does not.
// The awk in .github/workflows/release-*.yml applies the same rule.
export function changelogHasVersion(markdown, version) {
  return markdown.split('\n').some((line) => headingVersion(line) === version);
}

function headingVersion(line) {
  if (!line.startsWith('## ')) return;
  const token = line.slice(3).trim().split(/\s+/)[0] ?? '';
  return token.replace(/^\[/, '').replace(/\]$/, '');
}

// Every workspace package as pnpm sees it: name, version, path, private.
export function workspacePackages() {
  const { status, stdout, stderr } = run('pnpm', ['-r', 'ls', '--json', '--depth', '-1']);
  if (status !== 0) fail(`pnpm -r ls failed:\n${stderr}`);
  return JSON.parse(stdout);
}

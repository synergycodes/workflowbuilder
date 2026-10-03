#!/usr/bin/env node
// Prints the CHANGELOG section for a package's version: the body of the GitHub Release the
// release workflow creates. Exits 1 when the section is missing or empty, so the workflow
// step that uses it fails before an empty Release exists, and release:tag applies the same
// rule before the tag is pushed.
//
//   pnpm release:notes temporal                   the section for packages/temporal's current version
//   pnpm release:notes temporal --version 0.1.0   the section for that version
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { ROOT, changelogSection, fail, fullName, parseCommandLine, workspacePackages } from './release-shared.mjs';

const USAGE = 'Usage: pnpm release:notes <package> [--version X.Y.Z]';

const { values: flags, positionals } = parseCommandLine({ version: { type: 'string' } }, USAGE);
if (positionals.length !== 1) fail(USAGE);
const name = fullName(positionals[0]);

const workspacePackage = workspacePackages().find((p) => p.name === name);
if (!workspacePackage) fail(`${name} is not a workspace package.`);
const version =
  flags.version ?? JSON.parse(readFileSync(path.join(workspacePackage.path, 'package.json'), 'utf8')).version;

const changelog = path.join(workspacePackage.path, 'CHANGELOG.md');
const shown = path.relative(ROOT, changelog);
let markdown;
try {
  markdown = readFileSync(changelog, 'utf8');
} catch {
  fail(`${shown} does not exist.`);
}

const section = changelogSection(markdown, version);
if (section === undefined) fail(`${shown} has no section for ${version}.`);
if (section === '')
  fail(`${shown} has a heading for ${version} with nothing under it. The GitHub Release would be empty.`);
process.stdout.write(`${section}\n`);

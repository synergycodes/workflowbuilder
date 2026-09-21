import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  changelogHasNotes,
  changelogSection,
  fullName,
  npmVersionState,
  remoteRefSha,
  shortName,
} from './release-shared.mjs';

const changelog = [
  '# Changelog',
  '',
  '## 1.2.3-beta.1',
  '',
  '- beta bullet',
  '',
  '## [1.2.3] - 2026-06-16',
  '',
  '### Added',
  '',
  '- real bullet',
  '',
  '## 1.2.30',
  '',
  '- other',
  '',
  '## [1.2.2]',
  '## 1.2.1',
  '',
  '- old',
  '',
].join('\n');

test('the section is the body between the version heading and the next heading', () => {
  assert.equal(changelogSection(changelog, '1.2.3'), '### Added\n\n- real bullet');
  assert.equal(changelogSection(changelog, '1.2.1'), '- old');
});

test('accepts the bare heading Changesets writes and the dated Keep a Changelog heading', () => {
  assert.equal(changelogHasNotes('# Changelog\n\n## 1.2.3\n\n- a\n', '1.2.3'), true);
  assert.equal(changelogHasNotes(changelog, '1.2.3'), true);
});

test('rejects a prerelease heading and a longer version that merely starts the same way', () => {
  assert.equal(changelogHasNotes(changelog, '1.2.3-beta'), false);
  assert.equal(changelogSection(changelog, '1.2.30'), '- other');
  assert.equal(changelogHasNotes('# Changelog\n\n## [1.2.30] - 2026-06-16\n\n- a\n', '1.2.3'), false);
});

test('a heading with nothing under it is not notes', () => {
  assert.equal(changelogSection(changelog, '1.2.2'), '');
  assert.equal(changelogHasNotes(changelog, '1.2.2'), false);
  assert.equal(changelogHasNotes('# Changelog\n\n## 1.2.3\n', '1.2.3'), false);
});

test('a changelog without the heading has no section', () => {
  assert.equal(changelogSection('# Changelog\n', '1.2.3'), undefined);
  assert.equal(changelogHasNotes('# Changelog\n', '1.2.3'), false);
});

test('npm view answers: published, absent (empty or E404), unknown (anything else)', () => {
  assert.equal(npmVersionState({ status: 0, stdout: '1.2.3\n', stderr: '' }), 'published');
  assert.equal(npmVersionState({ status: 0, stdout: '', stderr: '' }), 'absent');
  assert.equal(
    npmVersionState({ status: 1, stdout: '', stderr: 'npm error code E404\nnpm error 404 Not Found' }),
    'absent',
  );
  assert.equal(npmVersionState({ status: 1, stdout: '', stderr: 'npm error code ECONNREFUSED' }), 'unknown');
});

test('ls-remote output yields the sha, or nothing when the ref is absent', () => {
  assert.equal(
    remoteRefSha('dd9aabeebbd5d680c7b1137e1df6d2f93c292de5\trefs/tags/@workflowbuilder/sdk@2.3.0\n'),
    'dd9aabeebbd5d680c7b1137e1df6d2f93c292de5',
  );
  assert.equal(remoteRefSha(''), undefined);
  assert.equal(remoteRefSha('\n'), undefined);
});

test('short and full package names round-trip, foreign scopes pass through', () => {
  assert.equal(fullName('temporal'), '@workflowbuilder/temporal');
  assert.equal(shortName('@workflowbuilder/temporal'), 'temporal');
  assert.equal(fullName('@other/thing'), '@other/thing');
  assert.equal(shortName('@other/thing'), '@other/thing');
});

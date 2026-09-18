import assert from 'node:assert/strict';
import { test } from 'node:test';

import { changelogHasVersion, fullName, shortName } from './release-shared.mjs';

test('accepts the bare heading Changesets writes', () => {
  assert.equal(changelogHasVersion('# Changelog\n\n## 1.2.3\n\n- a\n', '1.2.3'), true);
});

test('accepts the dated Keep a Changelog heading', () => {
  assert.equal(changelogHasVersion('# Changelog\n\n## [1.2.3] - 2026-06-16\n\n- a\n', '1.2.3'), true);
});

test('rejects a prerelease heading for the release version', () => {
  assert.equal(changelogHasVersion('# Changelog\n\n## 1.2.3-beta.1\n\n- a\n', '1.2.3'), false);
});

test('rejects a longer version that merely starts the same way', () => {
  assert.equal(changelogHasVersion('# Changelog\n\n## [1.2.30] - 2026-06-16\n\n- a\n', '1.2.3'), false);
});

test('rejects a changelog with only the heading', () => {
  assert.equal(changelogHasVersion('# Changelog\n', '1.2.3'), false);
});

test('short and full package names round-trip, foreign scopes pass through', () => {
  assert.equal(fullName('temporal'), '@workflowbuilder/temporal');
  assert.equal(shortName('@workflowbuilder/temporal'), 'temporal');
  assert.equal(fullName('@other/thing'), '@other/thing');
  assert.equal(shortName('@other/thing'), '@other/thing');
});

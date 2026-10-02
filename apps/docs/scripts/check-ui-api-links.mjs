// Post-build check: generate-ui-api.mjs only predicts UI API Reference page paths (`<category>/<name>`), so verify
// that every such link on the UI Library pages reaches a built page and that no `{@link ...}` marker is left.
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { UI_API_REFERENCE_DIRECTORY, containsTypeLink } from '../src/ui-api-reference.mjs';

const DISTRIBUTION_ROOT = path.resolve(import.meta.dirname, '../dist');
const UI_LIBRARY_PAGES = 'docs/ui-library/**/index.html';
const UI_API_REFERENCE_HREF_RE = new RegExp(
  String.raw`href="(?<href>/docs/${UI_API_REFERENCE_DIRECTORY}/[^"#]*)"`,
  'g',
);

const pages = globSync(UI_LIBRARY_PAGES, { cwd: DISTRIBUTION_ROOT });
const problems = new Set(pages.length > 0 ? pages.flatMap(findProblems) : [`no page matches ${UI_LIBRARY_PAGES}`]);

if (problems.size > 0) {
  console.error(['error: broken UI API Reference links', ...problems].join('\n'));
  process.exitCode = 1;
} else {
  console.log('✓ UI API Reference links ok.');
}

function findProblems(page) {
  const html = readFileSync(path.join(DISTRIBUTION_ROOT, page), 'utf8');
  const hrefs = [...html.matchAll(UI_API_REFERENCE_HREF_RE)].map(({ groups }) => groups.href);
  const missingPages = hrefs.filter((href) => !existsSync(path.join(DISTRIBUTION_ROOT, href, 'index.html')));
  const pageProblems = missingPages.map((href) => `${page}: ${href} has no page`);
  if (containsTypeLink(html)) pageProblems.push(`${page}: unrendered {@link} marker`);
  return pageProblems;
}

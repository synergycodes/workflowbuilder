// Post-build check: generate-ui-api.mjs only predicts UI API Reference page paths (`<category>/<name>`), so verify
// that every such link on the UI Library pages reaches a built page and that no `{@link ...}` marker is left.
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DISTRIBUTION_ROOT = path.resolve(import.meta.dirname, '../dist');
const UI_LIBRARY_PAGES = 'docs/ui-library/**/index.html';
const UNRENDERED_LINK_MARKER = '{@link ';
const UI_API_REFERENCE_HREF_RE = /href="(?<href>\/docs\/ui-api\/[^"#]*)"/g;

const problems = new Set(globSync(UI_LIBRARY_PAGES, { cwd: DISTRIBUTION_ROOT }).flatMap(findProblems));

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
  if (html.includes(UNRENDERED_LINK_MARKER)) pageProblems.push(`${page}: unrendered {@link} marker`);
  return pageProblems;
}

// Post-build check: every UI API Reference link on the UI Library pages reaches a built page, and no
// `{@link ...}` marker from generate-ui-api.mjs is left in the HTML. The generator only predicts page
// paths (`<category>/<name>`), so this catches starlight-typedoc placing a page elsewhere or dropping it.
import { existsSync, globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const distribution = path.resolve(import.meta.dirname, '../dist');
const problems = [];

for (const page of globSync('docs/ui-library/**/index.html', { cwd: distribution })) {
  const html = readFileSync(path.join(distribution, page), 'utf8');
  if (html.includes('{@link ')) problems.push(`${page}: unrendered {@link} marker`);
  for (const [, href] of html.matchAll(/href="(\/docs\/ui-api\/[^"#]*)"/g)) {
    if (!existsSync(path.join(distribution, href, 'index.html'))) problems.push(`${page}: ${href} has no page`);
  }
}

if (problems.length > 0) {
  console.error(`error: broken UI API Reference links\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exitCode = 1;
} else {
  console.log('✓ UI API Reference links ok.');
}

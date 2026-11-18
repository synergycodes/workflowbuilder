import { readFileSync } from 'node:fs';
import path from 'node:path';

// Vitest stubs CSS modules, so the rules are read from disk.
const css = readFileSync(path.join(import.meta.dirname, 'collapsible-body.module.css'), 'utf8').replaceAll(
  /\/\*[\s\S]*?\*\//g,
  '',
);

describe('collapsible-body.module.css', () => {
  it('moves the body bottom padding inside the collapsible, so a collapsed node is header-only', () => {
    expect(css).toMatch(/(^|\n)\.content\s*\{[^}]*padding-bottom:\s*0/);
    expect(css).toMatch(/(^|\n)\.collapsible\s*\{[^}]*padding-bottom:\s*var\(--wb-public-node-body-padding-block\)/);
  });

  it('hands the bottom padding to plugin content placed after the collapsible', () => {
    expect(css).toMatch(
      /\.content > :has\(\.collapsible\):not\(:last-child\) \.collapsible\s*\{[^}]*padding-bottom:\s*0/,
    );
    expect(css).toMatch(
      /\.content > :has\(\.collapsible\) ~ :last-child\s*\{[^}]*margin-bottom:\s*var\(--wb-public-node-body-padding-block\)/,
    );
  });
});

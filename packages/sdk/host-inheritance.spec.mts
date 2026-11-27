import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

function declarationsOf(file: string, selector: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  postcss.parse(fs.readFileSync(path.join(packageDirectory, file), 'utf8')).walkRules((rule) => {
    if (rule.selector !== selector) return;
    rule.walkDecls((declaration) => {
      declarations[declaration.prop] = declaration.value;
    });
  });
  return declarations;
}

const sdkRoot = declarationsOf('src/index.css', String.raw`:is(#\#, .workflow-builder-root).workflow-builder-root`);
const uiWrapper = declarationsOf(
  '../ui/src/styles/typography.css',
  String.raw`:is(#\#, .workflow-builder-root):where(.workflow-builder-root:not(.workflow-builder-root *))`,
);

// Inherited from a host's <html> or <body>; stopped by the SDK root and by a standalone UI wrapper alike.
const SHARED = {
  'font-family': "var(--wb-public-font-family, 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)",
  'letter-spacing': 'normal',
  'font-variant-numeric': 'normal',
  'font-variant-caps': 'normal',
  'font-feature-settings': 'normal',
  hyphens: 'manual',
  quotes: 'auto',
  'tab-size': '8',
  'list-style': 'disc outside none',
  'caret-color': 'auto',
  'accent-color': 'auto',
  'border-collapse': 'separate',
  'border-spacing': '0',
  'caption-side': 'top',
  '-webkit-font-smoothing': 'auto',
  '-moz-osx-font-smoothing': 'auto',
};

// A standalone wrapper can hold the host's own content, so it leaves text size and layout to the host.
const SDK_ONLY = {
  'font-size': '1rem',
  'font-weight': '400',
  'font-style': 'normal',
  'line-height': 'normal',
  'text-align': 'start',
  'text-indent': '0',
  'text-transform': 'none',
  'word-spacing': 'normal',
  'white-space': 'normal',
  'word-break': 'normal',
  'overflow-wrap': 'normal',
  'text-shadow': 'none',
  cursor: 'auto',
  'scrollbar-color': 'auto',
};

describe('host inheritance resets', () => {
  it('stops the same inherited properties in the SDK root and the standalone UI wrapper', () => {
    expect(sdkRoot).toMatchObject(SHARED);
    expect(uiWrapper).toMatchObject(SHARED);
  });

  // A property added to one rule fails here until it is added to the other or listed as SDK-only.
  it('lists every property of both rules', () => {
    expect(Object.keys(sdkRoot).sort()).toEqual([...Object.keys(SHARED), ...Object.keys(SDK_ONLY), 'color'].sort());
    expect(Object.keys(uiWrapper).sort()).toEqual([...Object.keys(SHARED), 'background-color', 'color'].sort());
  });

  it('resets text size and layout in the SDK root only', () => {
    expect(sdkRoot).toMatchObject(SDK_ONLY);
  });

  // The wrapper's surface is a host-facing variable; the SDK shell sets its own background at component weight.
  it('takes the text colour from the theme in both', () => {
    expect(sdkRoot['color']).toBe('var(--wb-ds-ui-text-default)');
    expect(uiWrapper['color']).toBe('var(--wb-public-root-color)');
    expect(uiWrapper['background-color']).toBe('var(--wb-public-root-background-color)');
  });
});

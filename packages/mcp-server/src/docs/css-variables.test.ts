import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readCssVariables } from './css-variables.js';

describe('readCssVariables', () => {
  let root: string;
  const write = (file: string, content: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'wb-docs-css-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const button = { slug: 'button', dir: 'button' };
  const nav = { slug: 'nav-button', dir: 'button/nav-button' };

  it('lists the public variables of the component folder', () => {
    write(
      'components/button/button.css',
      '.a { --wb-public-button-color: red; --wb-public-gap: 4px; --wb-internal-x: 1px; }',
    );
    expect(readCssVariables(root, button, [button])).toEqual(['--wb-public-button-color', '--wb-public-gap']);
  });

  it('appends the comment of a variable and drops internal notes', () => {
    write(
      'components/button/button.css',
      '.a { --wb-public-a: 1px /* Outer spacing */; } .b { --wb-public-b: 2px /* missing token */; }',
    );
    expect(readCssVariables(root, button, [button])).toEqual(['--wb-public-a (Outer spacing)', '--wb-public-b']);
  });

  it('leaves variables of nested documented components and adds extra sources once', () => {
    write('components/button/button.css', '.a { --wb-public-shared: 1px; }');
    write('components/button/nav-button/nav.css', '.a { --wb-public-nav: 1px; }');
    write('shared/extra.css', '.a { --wb-public-shared: 2px; --wb-public-extra: 3px; }');
    const parent = { ...button, cssSources: ['shared/extra.css', 'shared/missing.css'] };
    expect(readCssVariables(root, parent, [parent, nav])).toEqual(['--wb-public-shared', '--wb-public-extra']);
    expect(readCssVariables(root, nav, [parent, nav])).toEqual(['--wb-public-nav']);
  });

  it('returns nothing for a component without a stylesheet folder', () => {
    expect(readCssVariables(root, { slug: 'x', dir: null }, [])).toEqual([]);
    expect(readCssVariables(root, { slug: 'y', dir: 'absent' }, [])).toEqual([]);
  });
});

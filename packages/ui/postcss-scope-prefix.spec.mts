import { describe, expect, it } from 'vitest';

import postcss from 'postcss';

import { type PrefixStrength, scopePrefixPlugin } from './postcss-scope-prefix.mts';

const VENDORED = /node_modules[\\/](react-day-picker|@xyflow)[\\/]/;
const BASE = /[\\/]base\.css$/;

async function run(css: string, strength: PrefixStrength, from = '/fake/component.module.css'): Promise<string> {
  const result = await postcss([scopePrefixPlugin({ strength, vendoredFiles: VENDORED, baseFiles: BASE })]).process(
    css,
    { from },
  );
  return result.css;
}

describe('postcss-scope-prefix baseFiles', () => {
  it('wraps a base file selector in :where() behind the prefix', async () => {
    expect(await run('.button { color: red }', 'ui', '/x/src/base.css')).toBe(
      ':is(#wb, .workflow-builder-root) :where(.button) { color: red }',
    );
  });

  it('keeps a pseudo-element outside :where(), where browsers accept it', async () => {
    expect(await run('.button::after, .link:hover:before { color: red }', 'ui', '/x/src/base.css')).toBe(
      ':is(#wb, .workflow-builder-root) :where(.button)::after, :is(#wb, .workflow-builder-root) :where(.link:hover):before { color: red }',
    );
  });
});

describe('postcss-scope-prefix', () => {
  it('prefixes a component rule with the UI strength', async () => {
    expect(await run('.button { color: red }', 'ui')).toBe(':is(#wb, .workflow-builder-root) .button { color: red }');
  });

  it('uses the SDK strength', async () => {
    expect(await run('.panel { color: red }', 'sdk')).toBe(
      ':is(#wb, .workflow-builder-root).workflow-builder-root .panel { color: red }',
    );
  });

  it('uses :where for vendored files', async () => {
    expect(await run('.rdp-day { color: red }', 'ui', '/x/node_modules/react-day-picker/style.css')).toBe(
      ':where(.workflow-builder-root) .rdp-day { color: red }',
    );
  });

  it('skips :root and bare [data-wb-theme] default blocks', async () => {
    const input = ":root { --a: 1px }\n[data-wb-theme='dark'] { --b: 2px }";
    expect(await run(input, 'ui')).toBe(input);
  });

  it('prefixes a variable-only component rule so it keeps pace with its base rule', async () => {
    expect(await run("[data-wb-theme='dark'] .warning { --c: red }", 'sdk')).toBe(
      ":is(#wb, .workflow-builder-root).workflow-builder-root[data-wb-theme='dark'] .warning { --c: red }",
    );
  });

  it('compounds a [data-wb-theme] descendant selector', async () => {
    expect(await run("[data-wb-theme='dark'] .logo { opacity: 1 }", 'ui')).toBe(
      ":is(#wb, .workflow-builder-root)[data-wb-theme='dark'] .logo { opacity: 1 }",
    );
  });

  it('skips @keyframes steps and @font-face, descends into @media', async () => {
    const output = await run(
      '@keyframes spin { from { opacity: 0 } }\n@font-face { font-family: X }\n@media (min-width: 1px) { .a { color: red } }',
      'ui',
    );
    expect(output).toContain('from { opacity: 0 }');
    expect(output).not.toContain(':is(#wb, .workflow-builder-root) from');
    expect(output).toContain('@media (min-width: 1px) { :is(#wb, .workflow-builder-root) .a');
  });

  it('leaves rules inside @layer alone', async () => {
    const input = '@layer ui.base { .x { color: red } }';
    expect(await run(input, 'ui')).toBe(input);
  });

  it('handles top-level :global() and selector lists', async () => {
    expect(await run(':global(.ace_tooltip), .b { display: none }', 'sdk')).toBe(
      ':is(#wb, .workflow-builder-root).workflow-builder-root :global(.ace_tooltip), :is(#wb, .workflow-builder-root).workflow-builder-root .b { display: none }',
    );
  });

  it('is idempotent, also when UI output passes through the SDK build', async () => {
    const once = await run('.button { color: red }', 'ui');
    expect(await run(once, 'ui')).toBe(once);
    expect(await run(once, 'sdk')).toBe(once);
  });

  it('recognises its own prefix in minified UI dist CSS', async () => {
    const minified = ':is(#wb,.workflow-builder-root) ._button_1dpso_9{color:red}';
    expect(await run(minified, 'sdk')).toBe(minified);
  });

  it('leaves the shell rules alone', async () => {
    const input = '.workflow-builder-root-shell { position: relative }';
    expect(await run(input, 'sdk')).toBe(input);
  });
});

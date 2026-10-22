import { describe, expect, it } from 'vitest';

import postcss, { type Rule } from 'postcss';

import { isVariableOnlyRule, layerRootDefaultsPlugin } from './postcss-layer-root-defaults.mts';

async function run(css: string): Promise<string> {
  const result = await postcss([layerRootDefaultsPlugin()]).process(css, {
    from: '/fake/component.module.css',
  });
  return result.css;
}

function firstRule(css: string): Rule {
  return postcss.parse(css).first as Rule;
}

describe('postcss-layer-root-defaults', () => {
  it('moves a variable-only :root block onto [data-wb-theme] inside ui.base', async () => {
    const output = await run(':root { --wb-public-x: var(--wb-ds-y) }');
    expect(output.replaceAll(/\s+/g, ' ')).toBe('@layer ui.base { [data-wb-theme] { --wb-public-x: var(--wb-ds-y) }}');
  });

  it('keeps a :root block that sets a non-custom property on :root (still layered)', async () => {
    const output = await run(':root { --a: 1px; color: red }');
    expect(output.replaceAll(/\s+/g, ' ')).toBe('@layer ui.base { :root { --a: 1px; color: red } }');
  });

  it('wraps a hand-written [data-wb-theme] variable block without changing its selector', async () => {
    const output = await run("[data-wb-theme='dark'] { --x: 1px }");
    expect(output.replaceAll(/\s+/g, ' ')).toBe("@layer ui.base { [data-wb-theme='dark'] { --x: 1px }}");
  });

  it('leaves a component rule under [data-wb-theme] unlayered', async () => {
    const input = "[data-wb-theme='dark'] .button { color: red }";
    expect(await run(input)).toBe(input);
  });

  it('leaves compound [data-wb-theme] selectors and similar attribute names unlayered', async () => {
    for (const input of [
      "[data-wb-theme='dark'].panel { --x: 1px }",
      '[data-wb-theme]:hover { --x: 1px }',
      '[data-wb-theme-variant] { --x: 1px }',
    ]) {
      expect(await run(input)).toBe(input);
    }
  });

  it('wraps grouped and qualified :root selectors and keeps them', async () => {
    const output = await run(":root, .fallback { --x: 1px }\n:root[data-theme='dark'] { --y: 2px }");
    expect(output.match(/@layer ui\.base/g)).toHaveLength(2);
    expect(output).toContain(':root, .fallback');
    expect(output).toContain(":root[data-theme='dark']");
  });

  it('keeps multiple blocks in source order', async () => {
    const output = await run(':root { --a: 1px }\n.button { color: red }\n:root { --b: 2px }');
    expect(output.indexOf('--a')).toBeLessThan(output.indexOf('.button'));
    expect(output.indexOf('.button')).toBeLessThan(output.indexOf('--b'));
  });

  it('leaves :root already inside @layer alone', async () => {
    const input = '@layer ui.component { :root { --x: 1px } }';
    expect(await run(input)).toBe(input);
  });

  it('leaves non-root rules alone', async () => {
    const input = '.button { color: red }';
    expect(await run(input)).toBe(input);
  });
});

describe('isVariableOnlyRule', () => {
  it('accepts a block of custom properties, comments included', () => {
    expect(isVariableOnlyRule(firstRule(':root { --a: 1px }'))).toBe(true);
    expect(isVariableOnlyRule(firstRule(':root { /* radius */ --a: 1px }'))).toBe(true);
  });

  it('rejects a block that also sets a regular property', () => {
    expect(isVariableOnlyRule(firstRule(':root { --a: 1px; color: red }'))).toBe(false);
  });
});

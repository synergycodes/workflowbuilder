import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { layerRootDefaultsPlugin } from './postcss-layer-root-defaults.mts';

async function run(css: string): Promise<string> {
  const result = await postcss([layerRootDefaultsPlugin()]).process(css, {
    from: '/fake/component.module.css',
  });
  return result.css;
}

describe('postcss-layer-root-defaults', () => {
  it('wraps a top-level :root block in @layer ui.base', async () => {
    const output = await run(':root { --x: 1px }');
    expect(output.replaceAll(/\s+/g, ' ')).toBe('@layer ui.base { :root { --x: 1px }}');
  });

  it('wraps grouped and qualified :root selectors', async () => {
    const output = await run(":root, .fallback { --x: 1px }\n:root[data-theme='dark'] { --y: 2px }");
    expect(output.match(/@layer ui\.base/g)).toHaveLength(2);
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

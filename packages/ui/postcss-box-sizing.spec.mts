import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { boxSizingPlugin } from './postcss-box-sizing.mts';

async function run(css: string, from = '/fake/component.module.css'): Promise<string> {
  const result = await postcss([boxSizingPlugin()]).process(css, { from });
  return result.css;
}

describe('postcss-box-sizing', () => {
  it('prepends box-sizing to a plain styling rule', async () => {
    const output = await run('.button { color: red }');
    expect(output).toBe('.button { box-sizing: border-box; color: red }');
  });

  it('keeps an explicit box-sizing untouched', async () => {
    const output = await run('.button { box-sizing: content-box }');
    expect(output).toBe('.button { box-sizing: content-box }');
  });

  it('injects inside known styling at-rules, however nested', async () => {
    const output = await run(
      '@layer ui.component { @media (min-width: 1px) { .button { color: red } } }',
    );
    expect(output).toContain('box-sizing: border-box');
  });

  it('never touches @keyframes steps', async () => {
    const output = await run('@keyframes flash { 0% { opacity: 0 } to { opacity: 1 } }');
    expect(output).not.toContain('box-sizing');
  });

  it('skips at-rules outside the styling allowlist', async () => {
    const output = await run('@starting-style { .button { opacity: 0 } }');
    expect(output).not.toContain('box-sizing');
  });

  it('skips :root token blocks', async () => {
    const output = await run(':root { --x: 1px }');
    expect(output).not.toContain('box-sizing');
  });

  it('leaves non-module stylesheets alone', async () => {
    const output = await run('.button { color: red }', '/fake/global.css');
    expect(output).toBe('.button { color: red }');
  });
});

import { describe, expect, it } from 'vitest';

import { type CheckOptions, checkStylesheet } from './check-stylesheet';

const ui: CheckOptions = {
  from: '/repo/packages/ui/dist/x.css',
  directory: '/repo/packages/ui/dist',
  ownsPublicDefaults: true,
};
const sdk: CheckOptions = { ...ui, ownsPublicDefaults: false };

function problems(css: string, options: CheckOptions = ui): string {
  return checkStylesheet(css, options).join('\n');
}

const conforming = [
  '@layer ui.base;',
  '@layer ui.base { [data-wb-theme] { --wb-public-x: 1px } }',
  ':is(#wb, .workflow-builder-root) .a { color: red }',
  ':where(.workflow-builder-root) .rdp { color: red }',
  '@keyframes k { from { opacity: 0 } }',
].join('\n');

describe('checkStylesheet', () => {
  it('accepts a conforming stylesheet', () => {
    expect(problems(conforming)).toBe('');
  });

  it('accepts minified prefixes, also inside @media', () => {
    expect(problems('@layer ui.base;@media (min-width:1px){:is(#wb,.workflow-builder-root) .a{color:red}}')).toBe('');
  });

  it('rejects an unprefixed rule', () => {
    expect(problems('@layer ui.base;\n.a { color: red }')).toMatch(/Unprefixed built CSS/);
  });

  it('rejects an unprefixed rule inside @media', () => {
    expect(problems('@layer ui.base;\n@media (min-width: 1px) { .a { color: red } }')).toMatch(/Unprefixed built CSS/);
  });

  it('rejects a painting rule inside ui.base', () => {
    expect(problems('@layer ui.base;\n@layer ui.base { .a { color: red } }')).toMatch(/Painting rule inside @layer/);
  });

  it('rejects ui.component', () => {
    expect(problems('@layer ui.base;\n@layer ui.component { .a { color: red } }')).toMatch(/Unknown layer name/);
  });

  it('allows the editor-box rules and variable blocks unprefixed', () => {
    expect(problems('@layer ui.base;\n.workflow-builder-root-shell { position: relative }\n:root { --p: 1px }')).toBe(
      '',
    );
  });

  it('requires the layer order statement first', () => {
    expect(problems(':is(#wb, .workflow-builder-root) .a { color: red }')).toMatch(/Missing leading layer order/);
  });

  it('keeps the design-token guard', () => {
    expect(problems('@layer ui.base;\n@layer ui.base { [data-wb-theme] { --wb-ds-x: 1px } }')).toMatch(
      /Design token moved off :root/,
    );
  });

  it('keeps the :root default guard', () => {
    expect(problems('@layer ui.base;\n@layer ui.base { :root { --wb-sdk-x: 1px } }')).toMatch(
      /Default on :root cannot resolve themed tokens/,
    );
  });

  it('checks public default placement only where the package owns it', () => {
    const scopedOverride = '@layer ui.base;\n:is(#wb, .workflow-builder-root) .node { --wb-public-node-gap: 0 }';
    expect(problems(scopedOverride, ui)).toMatch(/Mis-scoped public variable default/);
    expect(problems(scopedOverride, sdk)).toBe('');
  });
});

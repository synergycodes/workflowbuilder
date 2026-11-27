import { describe, expect, it } from 'vitest';

import { type CheckOptions, checkStylesheet } from './check-stylesheet';

const ui: CheckOptions = {
  from: '/repo/packages/ui/dist/x.css',
  directory: '/repo/packages/ui/dist',
  bundle: 'ui',
};
const sdk: CheckOptions = { ...ui, bundle: 'sdk' };

function problems(css: string, options: CheckOptions = ui): string {
  return checkStylesheet(css, options).join('\n');
}

const conforming = [
  '@layer wb-ui.base;',
  '@layer wb-ui.base { [data-wb-theme] { --wb-public-x: 1px } }',
  String.raw`:is(#\#, .workflow-builder-root) .a { color: red }`,
  ':where(.workflow-builder-root) .rdp { color: red }',
  '@keyframes k { from { opacity: 0 } }',
].join('\n');

describe('checkStylesheet', () => {
  it('accepts a conforming stylesheet', () => {
    expect(problems(conforming)).toBe('');
  });

  it('accepts minified prefixes, also inside @media', () => {
    expect(
      problems(String.raw`@layer wb-ui.base;@media (min-width:1px){:is(#\#,.workflow-builder-root) .a{color:red}}`),
    ).toBe('');
  });

  it('rejects an unprefixed rule', () => {
    expect(problems('@layer wb-ui.base;\n.a { color: red }')).toMatch(/Unprefixed built CSS/);
  });

  it('rejects an unprefixed rule inside @media', () => {
    expect(problems('@layer wb-ui.base;\n@media (min-width: 1px) { .a { color: red } }')).toMatch(
      /Unprefixed built CSS/,
    );
  });

  it('rejects a painting rule inside wb-ui.base', () => {
    expect(problems('@layer wb-ui.base;\n@layer wb-ui.base { .a { color: red } }')).toMatch(
      /Painting rule inside @layer/,
    );
  });

  it('rejects ui.component', () => {
    expect(problems('@layer wb-ui.base;\n@layer ui.component { .a { color: red } }')).toMatch(/Unknown layer name/);
  });

  it('allows root-scoped resets unprefixed, but not a sibling of the root', () => {
    expect(problems('@layer wb-ui.base;\n.workflow-builder-root button { cursor: pointer }')).toBe('');
    expect(problems('@layer wb-ui.base;\n.workflow-builder-root ~ div { color: red }')).toMatch(/Unprefixed built CSS/);
  });

  it('reports a defaults block that stayed outside the layer, also inside @media', () => {
    expect(problems('@layer wb-ui.base;\n:root { --p: 1px }')).toMatch(/Defaults block outside @layer/);
    expect(problems('@layer wb-ui.base;\n@media (min-width: 1px) { [data-wb-theme] { --p: 1px } }')).toMatch(
      /Defaults block outside @layer/,
    );
    expect(
      problems('@layer wb-ui.base;\n@media (min-width: 1px) { @layer wb-ui.base { [data-wb-theme] { --p: 1px } } }'),
    ).toBe('');
  });

  it('reports a box class behind a combinator: the built rule would match nothing', () => {
    expect(
      problems(
        '@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).workflow-builder-root .workflow-builder-root-shell{position:relative}',
      ),
    ).toMatch(/Box class behind a combinator/);
    expect(problems('@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root) .wb-portal{display:contents}')).toMatch(
      /Box class behind a combinator/,
    );
    expect(problems('@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).wb-portal{display:contents}')).toBe('');
  });

  it('rejects a foreign class hashed by CSS modules, even behind a prefix', () => {
    expect(
      problems(
        '@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).workflow-builder-root :where(._workflow-builder-root_14e4s_3) :where(._target_14e4s_3) { display: contents }',
      ),
    ).toMatch(/Hashed foreign class/);
    expect(
      problems('@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root) ._react-flow__handle_ab12c_7 { top: 0 }'),
    ).toMatch(/Hashed foreign class/);
    expect(
      problems('@layer wb-ui.base;\n:where(.workflow-builder-root) :where(._target_14e4s_3) { display: contents }'),
    ).toBe('');
  });

  it('rejects a bare shell rule: the root class ends at a class boundary', () => {
    expect(problems('@layer wb-ui.base;\n.workflow-builder-root-shell { position: relative }')).toMatch(
      /Unprefixed built CSS/,
    );
    expect(
      problems(
        '@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).workflow-builder-root-shell { position: relative }',
      ),
    ).toBe('');
  });

  it('rejects an unprefixed variable override under a theme', () => {
    expect(problems("@layer wb-ui.base;\n[data-wb-theme='dark'] .x { --a: 1 }")).toMatch(/Unprefixed built CSS/);
  });

  it('requires the layer order statement first', () => {
    expect(problems(String.raw`:is(#\#, .workflow-builder-root) .a { color: red }`)).toMatch(
      /Missing leading layer order/,
    );
  });

  it('keeps the design-token guard', () => {
    expect(problems('@layer wb-ui.base;\n@layer wb-ui.base { [data-wb-theme] { --wb-ds-x: 1px } }')).toMatch(
      /Design token moved off :root/,
    );
  });

  it('keeps the :root default guard', () => {
    expect(problems('@layer wb-ui.base;\n@layer wb-ui.base { :root { --wb-sdk-x: 1px } }')).toMatch(
      /Default on :root cannot resolve themed tokens/,
    );
  });

  it('accepts a themed public default in minified form', () => {
    expect(problems('@layer wb-ui.base;@layer wb-ui.base{[data-wb-theme=dark]{--wb-public-x:1px}}')).toBe('');
  });

  it('checks public default placement only where the package owns it', () => {
    const scopedOverride = '@layer wb-ui.base;\n:is(#\\#, .workflow-builder-root) .node { --wb-public-node-gap: 0 }';
    expect(problems(scopedOverride, ui)).toMatch(/Mis-scoped public variable default/);
    expect(problems(scopedOverride, sdk)).toBe('');
  });

  it('refuses the SDK prefix in the UI dist only, and not a glued box rule', () => {
    const sdkRule = '@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).workflow-builder-root ._panel_x{color:red}';
    expect(problems(sdkRule, ui)).toMatch(/SDK prefix in the UI dist/);
    expect(problems(sdkRule, sdk)).toBe('');
    expect(
      problems(
        '@layer wb-ui.base;\n:is(#\\#,.workflow-builder-root).workflow-builder-root-shell{position:relative}',
        ui,
      ),
    ).not.toMatch(/SDK prefix in the UI dist/);
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { NodeIcon, type NodeIconAccent } from './node-icon';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

// The `ai` glyph is white in both themes, so only its container has a dark override.
const HAS_DARK_GLYPH = {
  blue: true,
  green: true,
  orange: true,
  violet: true,
  neutral: true,
  ai: false,
} satisfies Record<NodeIconAccent, boolean>;
const ACCENTS = Object.keys(HAS_DARK_GLYPH) as NodeIconAccent[];

describe('NodeIcon', () => {
  it.each(ACCENTS)('marks the %s accent', (accent) => {
    act(() => root.render(<NodeIcon icon={<svg />} accent={accent} />));

    const className = container.firstElementChild?.className;
    expect(className).toMatch(new RegExp(`accent-${accent}`));
    expect(className).toMatch(/accented/);
  });

  it('keeps the default look without an accent', () => {
    act(() => root.render(<NodeIcon icon={<svg />} />));

    expect(container.firstElementChild?.className).not.toMatch(/accent/);
  });

  it('keeps the accent next to the disabled state', () => {
    act(() => root.render(<NodeIcon icon={<svg />} accent="violet" disabled />));

    const className = container.firstElementChild?.className;
    expect(className).toMatch(/accent-violet/);
    expect(className).toMatch(/disabled/);
  });
});

// Vitest resolves any CSS module key, so the class names above pass even without a matching rule.
describe('node-icon.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-icon.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  function declarations(selector: string) {
    const found = new Map<string, string>();
    stylesheet.walkRules(selector, (rule) => {
      for (const node of rule.nodes) {
        if (node.type === 'decl') found.set(node.prop, node.value);
      }
    });
    return found;
  }

  const light = declarations(':root');
  const dark = declarations(":root[data-theme='dark']");

  it.each(ACCENTS)('styles the %s accent in both themes', (accent) => {
    const glyph = `--wb-public-node-icon-color-${accent}`;
    const background = `--wb-public-node-icon-container-background-color-${accent}`;

    expect(light.has(glyph)).toBe(true);
    expect(light.has(background)).toBe(true);
    expect(dark.has(glyph)).toBe(HAS_DARK_GLYPH[accent]);
    expect(dark.has(background)).toBe(true);

    const rule = declarations(`&.accent-${accent}`);
    expect(rule.get('color')).toBe(`var(${glyph})`);
    expect(rule.get('background')).toBe(`var(${background})`);
  });

  it('hides the border of an accented icon unless it is disabled', () => {
    const rule = declarations('&.accented:not(.disabled)');
    expect(rule.get('border-color')).toBe('transparent');
    expect(rule.get('background-origin')).toBe('border-box');
  });

  it('puts the disabled rule after every accent rule, which it beats only by source order', () => {
    const order: string[] = [];
    stylesheet.walkRules((rule) => {
      order.push(rule.selector);
    });

    const disabled = order.indexOf('&.disabled');
    expect(disabled).toBeGreaterThan(-1);
    for (const accent of ACCENTS) {
      expect(order.indexOf(`&.accent-${accent}`)).toBeLessThan(disabled);
    }
  });
});

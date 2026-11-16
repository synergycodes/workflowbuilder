import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { NodeIcon } from './node-icon';

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

// The `violet-gradient` glyph is white in both themes, so only its container has a dark override.
const HAS_DARK_GLYPH: Record<string, boolean> = {
  blue: true,
  green: true,
  orange: true,
  violet: true,
  gray: true,
  'violet-gradient': false,
};
const ACCENTS = Object.keys(HAS_DARK_GLYPH);

function rendered() {
  return container.firstElementChild as HTMLElement;
}

describe('NodeIcon', () => {
  it.each([...ACCENTS, 'teal'])('points the %s accent at its public variables', (accent) => {
    act(() => root.render(<NodeIcon icon={<svg />} accent={accent} />));

    expect(rendered().className).toMatch(/accented/);
    expect(rendered().style.getPropertyValue('--node-icon-color')).toBe(
      `var(--wb-public-node-icon-color-${accent}, var(--wb-public-node-icon-color))`,
    );
    expect(rendered().style.getPropertyValue('--node-icon-background')).toBe(
      `var(--wb-public-node-icon-container-background-color-${accent}, var(--wb-public-node-icon-container-background-color))`,
    );
  });

  it('keeps the default look without an accent', () => {
    act(() => root.render(<NodeIcon icon={<svg />} />));

    expect(rendered().className).not.toMatch(/accented/);
    expect(rendered().getAttribute('style')).toBeNull();
  });

  it('ignores an accent that is not a plain name', () => {
    act(() => root.render(<NodeIcon icon={<svg />} accent="red); color: (red" />));

    expect(rendered().className).not.toMatch(/accented/);
    expect(rendered().getAttribute('style')).toBeNull();
  });

  it('keeps the accent next to the disabled state', () => {
    act(() => root.render(<NodeIcon icon={<svg />} accent="violet" disabled />));

    expect(rendered().className).toMatch(/accented/);
    expect(rendered().className).toMatch(/disabled/);
  });
});

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

  it.each(ACCENTS)('defines the %s accent in both themes', (accent) => {
    const glyph = `--wb-public-node-icon-color-${accent}`;
    const background = `--wb-public-node-icon-container-background-color-${accent}`;

    expect(light.has(glyph)).toBe(true);
    expect(light.has(background)).toBe(true);
    expect(dark.has(glyph)).toBe(HAS_DARK_GLYPH[accent]);
    expect(dark.has(background)).toBe(true);
  });

  it('colors the icon through the variables an accent replaces', () => {
    const rule = declarations('.container');
    expect(rule.get('--node-icon-color')).toBe('var(--wb-public-node-icon-color)');
    expect(rule.get('--node-icon-background')).toBe('var(--wb-public-node-icon-container-background-color)');
    expect(rule.get('color')).toBe('var(--node-icon-color)');
    expect(rule.get('background')).toBe('var(--node-icon-background)');
  });

  it('hides the border of an accented icon unless it is disabled', () => {
    const rule = declarations('&.accented:not(.disabled)');
    expect(rule.get('border-color')).toBe('transparent');
    expect(rule.get('background-origin')).toBe('border-box');
  });
});

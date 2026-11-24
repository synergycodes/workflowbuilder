import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss from 'postcss';

import { Chip } from './chip';

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

function rendered() {
  return container.firstElementChild as HTMLElement;
}

describe('Chip', () => {
  it('takes the colour variables through style', () => {
    act(() =>
      root.render(
        <Chip
          label="Tag"
          style={{ '--wb-public-chip-background-color': 'red', '--wb-public-chip-color': 'white' } as never}
        />,
      ),
    );

    expect(rendered().style.getPropertyValue('--wb-public-chip-background-color')).toBe('red');
    expect(rendered().style.getPropertyValue('--wb-public-chip-color')).toBe('white');
  });

  it('takes the outline variables through style', () => {
    act(() =>
      root.render(
        <Chip
          label="Tag"
          variant="outline"
          style={
            { '--wb-public-chip-color-outline': 'blue', '--wb-public-chip-background-color-outline': 'pink' } as never
          }
        />,
      ),
    );

    expect(rendered().style.getPropertyValue('--wb-public-chip-color-outline')).toBe('blue');
    expect(rendered().style.getPropertyValue('--wb-public-chip-background-color-outline')).toBe('pink');
  });

  it('puts className on the root', () => {
    act(() => root.render(<Chip label="Tag" className="mine" />));

    expect(rendered().className).toMatch(/\bmine\b/);
  });
});

describe('chip.module.css', () => {
  const file = path.join(import.meta.dirname, 'chip.module.css');
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

  const defaults = declarations(':root');

  it.each([
    ['--wb-public-chip-background-color', 'chips-bg-solid'],
    ['--wb-public-chip-color', 'chips-fg-solid'],
    ['--wb-public-chip-color-outline', 'chips-fg-outline'],
    ['--wb-public-chip-background-color-outline', 'chips-overlay-outline'],
  ])("defaults %s to today's token %s on :root", (variable, token) => {
    expect(defaults.get(variable)).toBe(`var(--wb-ds-components-${token})`);
  });

  it('draws solid from the solid pair', () => {
    const rule = declarations('.solid');
    expect(rule.get('background-color')).toBe('var(--wb-public-chip-background-color)');
    expect(rule.get('color')).toBe('var(--wb-public-chip-color)');
  });

  it('draws outline text, ring and fill from the outline colour, and the wash from the outline background', () => {
    const rule = declarations('.outline');
    expect(rule.get('color')).toBe('var(--wb-public-chip-color-outline)');
    expect(rule.get('background-color')).toBe('var(--wb-public-chip-color-outline)');
    expect(rule.get('box-shadow')).toContain('var(--wb-public-chip-color-outline)');
    expect(rule.get('background-image')).toContain('var(--wb-public-chip-background-color-outline)');
  });

  it('reads no design-system chip token outside the :root defaults', () => {
    stylesheet.walkDecls((decl) => {
      if (decl.parent?.type === 'rule' && (decl.parent as postcss.Rule).selector === ':root') return;
      expect(decl.value).not.toMatch(/--wb-ds-components-chips-/);
    });
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import postcss, { type Rule } from 'postcss';

import { NodePanel } from './node-panel';

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
  vi.restoreAllMocks();
});

function render(node: ReactNode) {
  act(() => root.render(node));
  return container.firstElementChild!.firstElementChild as HTMLElement;
}

function renderRoot(props: { selected: boolean; disabled?: boolean }) {
  return render(
    <NodePanel.Root {...props}>
      <NodePanel.Header>header</NodePanel.Header>
    </NodePanel.Root>,
  );
}

describe('NodePanel.Root states', () => {
  it('marks the shell as selected', () => {
    const shell = renderRoot({ selected: true });
    expect(shell.className).toMatch(/selected/);
    expect(shell.className).not.toMatch(/disabled/);
  });

  it('marks the shell as disabled', () => {
    const shell = renderRoot({ selected: false, disabled: true });
    expect(shell.className).toMatch(/disabled/);
    expect(shell.className).not.toMatch(/selected/);
  });
});

describe('NodePanel.Overlay', () => {
  it('is an accepted slot rendered inside the shell', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const shell = render(
      <NodePanel.Root selected={false}>
        <NodePanel.Header>header</NodePanel.Header>
        <NodePanel.Overlay>
          <span data-testid="ring" />
        </NodePanel.Overlay>
      </NodePanel.Root>,
    );

    expect(error).not.toHaveBeenCalled();
    expect(shell.querySelector('[data-testid="ring"]')).not.toBeNull();
  });

  it('renders nothing when isVisible is false', () => {
    const shell = render(
      <NodePanel.Root selected={false}>
        <NodePanel.Overlay isVisible={false}>
          <span data-testid="ring" />
        </NodePanel.Overlay>
      </NodePanel.Root>,
    );

    expect(shell.childElementCount).toBe(1);
    expect(shell.querySelector('[data-testid="ring"]')).toBeNull();
  });

  it('reports a second Overlay like any duplicate slot and renders only the first', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const shell = render(
      <NodePanel.Root selected={false}>
        <NodePanel.Overlay>
          <span data-testid="first" />
        </NodePanel.Overlay>
        <NodePanel.Overlay>
          <span data-testid="second" />
        </NodePanel.Overlay>
      </NodePanel.Root>,
    );

    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unknown children detected'));
    expect(shell.querySelector('[data-testid="first"]')).not.toBeNull();
    expect(shell.querySelector('[data-testid="second"]')).toBeNull();
  });
});

describe('node-panel.module.css Overlay', () => {
  const stylesheet = parse('node-panel.module.css');

  it('positions the container and lifts its handles only while an Overlay renders', () => {
    const declarations = (rule: Rule) =>
      Object.fromEntries(rule.nodes.flatMap((node) => (node.type === 'decl' ? [[node.prop, node.value]] : [])));
    let container: Rule | undefined;
    let overlay: Rule | undefined;
    stylesheet.walkRules((rule) => {
      if (rule.selector === '.container') container = rule;
      if (rule.selector === '&:has(> .overlay)') overlay = rule;
    });
    const handle = overlay?.nodes.find(
      (node): node is Rule => node.type === 'rule' && node.selector === ':global(.react-flow__handle)',
    );

    expect(declarations(container!)).not.toHaveProperty('position');
    expect(declarations(overlay!)).toMatchObject({ position: 'relative' });
    expect(declarations(handle!)).toMatchObject({ 'z-index': '1', 'box-sizing': 'content-box' });
  });

  it('lets clicks through the Overlay to the node and its handles', () => {
    let pointerEvents: string | undefined;
    stylesheet.walkRules('.overlay', (rule) => {
      rule.walkDecls('pointer-events', (declaration) => {
        pointerEvents = declaration.value;
      });
    });

    expect(pointerEvents).toBe('none');
  });
});

function parse(name: string) {
  const file = path.join(import.meta.dirname, name);
  return postcss.parse(readFileSync(file, 'utf8'), { from: file });
}

describe('node-panel.module.css', () => {
  const stylesheet = parse('node-panel.module.css');
  const handleStylesheet = parse('handle.module.css');

  function declarations(selector: string | RegExp, sheet = stylesheet) {
    const found = new Map<string, string>();
    sheet.walkRules(selector, (rule) => {
      for (const node of rule.nodes) {
        if (node.type === 'decl') found.set(node.prop, node.value.replaceAll(/\s+/g, ' '));
      }
    });
    return found;
  }

  // AI Studio's run highlight sets box-shadow, so the stroke must not live there.
  it('draws the stroke as an inset outline', () => {
    const rule = declarations('.container');
    expect(rule.get('outline')).toBe('var(--wb-public-node-border-size) solid var(--wb-public-node-border-color)');
    expect(rule.get('outline-offset')).toBe('calc(-1 * var(--wb-public-node-border-size))');
    expect(rule.has('border')).toBe(false);
  });

  it('spaces the header through public variables', () => {
    const rule = declarations('.header-container');
    expect(rule.get('padding')).toBe(
      'var(--wb-public-node-header-padding-block) var(--wb-public-node-header-padding-inline)',
    );
    expect(rule.get('gap')).toBe('var(--wb-public-node-header-gap)');
  });

  it('sizes the header row from its block padding', () => {
    expect(declarations('.header-container').get('min-height')).toBe(
      'calc( 2 * var(--wb-public-node-header-padding-block) + 2 * var(--wb-public-node-icon-padding) + var(--wb-public-node-icon-glyph-size) )',
    );
  });

  // The ports are siblings of the header, so they repeat its spacing to sit on the row's centre line.
  it('centres the header ports on the header row', () => {
    const rule = declarations(/react-flow__handle-right, .*react-flow__handle-left/, handleStylesheet);
    expect(rule.get('top')).toBe(
      'calc( var(--wb-public-node-header-padding-block) + var(--wb-public-node-icon-padding) + var(--wb-public-node-icon-glyph-size) / 2 )',
    );
  });
});

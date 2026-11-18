import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import postcss from 'postcss';

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
});

function renderRoot(props: { selected: boolean; disabled?: boolean }) {
  act(() => {
    root.render(
      <NodePanel.Root {...props}>
        <NodePanel.Header>header</NodePanel.Header>
      </NodePanel.Root>,
    );
  });
  return container.firstElementChild!.firstElementChild as HTMLElement;
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

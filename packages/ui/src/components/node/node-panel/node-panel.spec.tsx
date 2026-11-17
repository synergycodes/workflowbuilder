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

describe('node-panel.module.css', () => {
  const file = path.join(import.meta.dirname, 'node-panel.module.css');
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
});

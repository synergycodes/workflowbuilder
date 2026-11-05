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

describe('node-panel.module.css run overlay rule', () => {
  const file = path.join(import.meta.dirname, 'node-panel.module.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  it('swaps the selected focus ring for the run status variable under a [data-node-run-overlay] element', () => {
    const rules: Rule[] = [];
    stylesheet.walkRules((rule) => {
      if (rule.selector.includes(':has(> .overlay [data-node-run-overlay])')) rules.push(rule);
    });

    expect(rules).toHaveLength(1);
    let boxShadow = '';
    rules[0]!.walkDecls('box-shadow', (declaration) => {
      boxShadow = declaration.value;
    });
    expect(boxShadow).toMatch(/var\(--wb-public-node-box-shadow-selected-with-run-status\)$/);
    expect(rules[0]!.selector).toContain('.selected');

    let fallback = '';
    stylesheet.walkDecls('--wb-public-node-box-shadow-selected-with-run-status', (declaration) => {
      fallback = declaration.value;
    });
    expect(fallback).toMatch(/^0 0 0 0 transparent/);
  });

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
});

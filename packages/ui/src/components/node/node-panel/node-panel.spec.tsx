import { type ReactNode, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showSnackbar } from './show-snackbar';
import { SnackbarContainer } from './snackbar-container';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SnackbarContainer />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe('SnackbarContainer', () => {
  it('gives the bottom-centre stack its own class', () => {
    act(() => {
      showSnackbar({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null });
    });

    const stack = document.querySelector('.notistack-SnackbarContainer');

    expect(stack?.textContent).toContain('Waiting for decision');
    expect(stack?.className).toContain('bottom-center');
  });

  // Vitest stubs CSS modules, so the rule is read from disk.
  it('raises that class by the offset variable, unlayered and doubled to outrank the notistack rule', () => {
    const css = readFileSync(path.join(import.meta.dirname, 'snackbar-container.module.css'), 'utf8').replaceAll(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    expect(css).not.toContain('@layer');
    expect(css).toMatch(
      /\.bottom-center\.bottom-center\s*\{[^}]*bottom:\s*calc\(var\(--wb-public-snackbar-offset-bottom\) - 6px\)/,
    );
    expect(css).toMatch(/\.bottom-center\.bottom-center\s*\{[^}]*transition:\s*none/);
  });

  it('pins a stack too tall for the space above the offset to the viewport top, unsqueezed', () => {
    const css = readFileSync(path.join(import.meta.dirname, 'snackbar-container.module.css'), 'utf8').replaceAll(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    expect(css).toMatch(/\.bottom-center\.bottom-center\s*\{[^}]*top:\s*14px/);
    expect(css).toMatch(/\.bottom-center\.bottom-center\s*\{[^}]*justify-content:\s*safe flex-start/);
    expect(css).toMatch(/\.bottom-center\.bottom-center\s*>\s*\*\s*\{[^}]*flex-shrink:\s*0/);
  });

  // `safe flex-start` falls back to the top only because notistack lays the stack out bottom-up.
  it('keeps notistack stacking the bottom-centre snackbars bottom-up', () => {
    act(() => {
      showSnackbar({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null });
    });

    const stack = document.querySelector<HTMLElement>('.notistack-SnackbarContainer');

    expect(stack && getComputedStyle(stack).flexDirection).toBe('column-reverse');
  });

  it('subtracts the padding notistack puts around each snackbar', () => {
    act(() => {
      showSnackbar({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null });
    });

    const wrapper = document.querySelector<HTMLElement>('.notistack-CollapseWrapper');

    expect(wrapper && getComputedStyle(wrapper).paddingBottom).toBe('6px');
  });
});

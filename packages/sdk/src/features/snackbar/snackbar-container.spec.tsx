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

  // jsdom applies no CSS and Vitest stubs CSS modules, so the rule is read from disk.
  it('raises that class by the offset variable, doubled to outrank the one-class notistack rule', () => {
    const css = readFileSync(path.join(import.meta.dirname, 'snackbar-container.module.css'), 'utf8');

    expect(css).toMatch(
      /\.bottom-center\.bottom-center\s*\{[^}]*bottom:\s*calc\(var\(--wb-public-snackbar-offset-bottom\) - 6px\)/,
    );
  });
});

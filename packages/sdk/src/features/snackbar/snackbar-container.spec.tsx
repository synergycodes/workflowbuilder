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
  it('places the bottom-centre stack with the class that reads the offset variable', () => {
    act(() => {
      showSnackbar({ variant: 'info', title: 'Waiting for decision', autoHideDuration: null });
    });

    const stack = document.querySelector('.notistack-SnackbarContainer');

    expect(stack?.textContent).toContain('Waiting for decision');
    expect(stack?.className).toContain('bottom-center');
  });
});

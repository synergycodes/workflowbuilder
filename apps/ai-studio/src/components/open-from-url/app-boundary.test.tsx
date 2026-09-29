import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppBoundary } from './app-boundary';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Crashing(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'x')");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppBoundary', () => {
  it('shows a way back to the local draft instead of a blank page when the editor throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() =>
      root.render(
        <AppBoundary>
          <Crashing />
        </AppBoundary>,
      ),
    );

    expect(container.textContent).toContain('could not be drawn');
    expect(container.querySelector('button')?.textContent).toBe('Open local draft');
    act(() => root.unmount());
  });
});

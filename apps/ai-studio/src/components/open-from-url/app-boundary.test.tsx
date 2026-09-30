import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setExecutionStarted, useExecutionStore } from '../../stores/use-execution-store';
import { AppBoundary } from './app-boundary';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function Crashing(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'x')");
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function renderCrash() {
  act(() =>
    root.render(
      <AppBoundary>
        <Crashing />
      </AppBoundary>,
    ),
  );
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AppBoundary', () => {
  it('shows a way back to the local draft instead of a blank page when the editor throws', () => {
    renderCrash();

    expect(container.textContent).toContain('could not be drawn');
    expect(container.querySelector('button')?.textContent).toBe('Open local draft');
  });

  it('forgets the run that crashed before leaving, so the bare address does not reopen it', () => {
    setExecutionStarted(RUN, `/api/executions/${RUN}/stream`);
    const assign = vi.fn();
    vi.stubGlobal('location', { ...globalThis.location, pathname: '/', assign });
    renderCrash();

    act(() => container.querySelector('button')!.click());

    expect(useExecutionStore.getState().executionId).toBeUndefined();
    expect(assign).toHaveBeenCalledWith('/');
  });
});

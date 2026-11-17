import { useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useReadOnlyHidesCanvasGrid } from './use-read-only-hides-canvas-grid';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const gridColor = () => document.documentElement.style.getPropertyValue('--wb-public-canvas-grid-color');
const setReadOnly = (isReadOnly: boolean) => act(() => useStore.setState({ isReadOnly }));

function Probe() {
  useReadOnlyHidesCanvasGrid();
  return null;
}

describe('useReadOnlyHidesCanvasGrid', () => {
  let root: ReturnType<typeof createRoot>;
  let isMounted: boolean;

  beforeEach(() => {
    useStore.setState({ isReadOnly: false });
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
    isMounted = true;
  });

  afterEach(() => {
    if (isMounted) act(() => root.unmount());
  });

  it('shows the grid while the canvas can be edited', () => {
    expect(gridColor()).toBe('');
  });

  it('hides the grid while the canvas is read-only and brings it back once editing is possible', () => {
    setReadOnly(true);
    expect(gridColor()).toBe('transparent');

    setReadOnly(false);
    expect(gridColor()).toBe('');
  });

  it('brings the grid back when the editor unmounts while read-only', () => {
    setReadOnly(true);
    act(() => root.unmount());
    isMounted = false;

    expect(gridColor()).toBe('');
  });
});

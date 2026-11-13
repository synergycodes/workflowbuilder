import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { executionEvent as event } from '../stores/execution-event.fixture';
import { applyEvent, applySnapshot, resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { useRunHidesCanvasGrid } from './use-run-hides-canvas-grid';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const gridColor = () => document.documentElement.style.getPropertyValue('--wb-public-canvas-grid-color');

function Probe() {
  useRunHidesCanvasGrid();
  return null;
}

describe('useRunHidesCanvasGrid', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    resetExecution();
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('hides the grid when a run starts and keeps it hidden after the run ends, until Reset', () => {
    expect(gridColor()).toBe('');

    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    expect(gridColor()).toBe('transparent');

    act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));
    expect(gridColor()).toBe('transparent');

    act(() => resetExecution());
    expect(gridColor()).toBe('');
  });

  it('keeps the grid hidden when a second run starts before Reset', () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    act(() => setExecutionStarted('exec-2', '/api/executions/exec-2/stream'));

    expect(gridColor()).toBe('transparent');
  });

  it('hides the grid for a run restored from its snapshot', () => {
    act(() => applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 0, events: [] }));

    expect(gridColor()).toBe('transparent');
  });

  it('brings the grid back when the editor unmounts during a run', () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    act(() => root.unmount());

    expect(gridColor()).toBe('');

    root = createRoot(document.createElement('div'));
  });
});

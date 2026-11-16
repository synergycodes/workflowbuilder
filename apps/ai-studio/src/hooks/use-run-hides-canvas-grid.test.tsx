import { trackFutureChange } from '@workflowbuilder/sdk';
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

const startRun = (executionId = 'exec-1') =>
  act(() => setExecutionStarted(executionId, `/api/executions/${executionId}/stream`));
const completeRun = () => act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));
const change = (changeName: string) => act(() => trackFutureChange(changeName));

function Probe() {
  useRunHidesCanvasGrid();
  return null;
}

describe('useRunHidesCanvasGrid', () => {
  let root: ReturnType<typeof createRoot>;
  let isMounted: boolean;

  beforeEach(() => {
    resetExecution();
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
    isMounted = true;
  });

  afterEach(() => {
    if (isMounted) act(() => root.unmount());
  });

  it('hides the grid when a run starts and keeps it hidden after the run ends, until Reset', () => {
    expect(gridColor()).toBe('');

    startRun();
    expect(gridColor()).toBe('transparent');

    completeRun();
    expect(gridColor()).toBe('transparent');

    act(() => resetExecution());
    expect(gridColor()).toBe('');
  });

  it('brings the grid back on the first edit after the run ends', () => {
    startRun();
    completeRun();

    change('nodeDragStart');

    expect(gridColor()).toBe('');
  });

  it('keeps the grid hidden when a node is only selected after the run', () => {
    startRun();
    completeRun();

    change('nodeDragChange');

    expect(gridColor()).toBe('transparent');
  });

  it('does not count an edit made while the run is alive, even once the run has ended', () => {
    startRun();
    act(() => applyEvent(event({ type: 'execution_started', payload: { workflowId: 'wf-1' } })));

    change('addNode');
    expect(gridColor()).toBe('transparent');

    completeRun();
    expect(gridColor()).toBe('transparent');

    change('addNode');
    expect(gridColor()).toBe('');
  });

  it('keeps the grid once it is back, when the edit is undone', () => {
    startRun();
    completeRun();
    change('addEdge');

    change('undo');

    expect(gridColor()).toBe('');
  });

  it('hides the grid again for the next run after an edit brought it back', () => {
    startRun();
    completeRun();
    change('delete');

    startRun('exec-2');

    expect(gridColor()).toBe('transparent');
  });

  it('keeps the grid hidden when a second run starts before Reset', () => {
    startRun();
    startRun('exec-2');

    expect(gridColor()).toBe('transparent');
  });

  it('hides the grid for a run restored from its snapshot', () => {
    act(() => applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 0, events: [] }));

    expect(gridColor()).toBe('transparent');
  });

  it('hides the grid for an ended run restored from its snapshot, until an edit', () => {
    act(() => applySnapshot({ executionId: 'exec-1', status: 'completed', lastSequence: 0, events: [] }));
    expect(gridColor()).toBe('transparent');

    change('dataUpdate');
    expect(gridColor()).toBe('');
  });

  it('brings the grid back when the editor unmounts during a run', () => {
    startRun();
    act(() => root.unmount());
    isMounted = false;

    expect(gridColor()).toBe('');
  });

  it('stops listening for edits once the editor unmounts', () => {
    startRun();
    completeRun();
    act(() => root.unmount());
    isMounted = false;

    change('addNode');
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
    isMounted = true;

    expect(gridColor()).toBe('transparent');
  });
});

import { useStore } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { executionEvent as event } from '../stores/execution-event.fixture';
import { applyEvent, applySnapshot, resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { useRunLocksCanvas } from './use-run-locks-canvas';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const isReadOnly = () => useStore.getState().isReadOnlyMode;

function Probe() {
  useRunLocksCanvas();
  return null;
}

describe('useRunLocksCanvas', () => {
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    resetExecution();
    useStore.getState().setToggleReadOnlyMode(false);
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('locks the canvas when a run starts and keeps it locked after the run ends, until Reset', () => {
    expect(isReadOnly()).toBe(false);

    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    expect(isReadOnly()).toBe(true);

    act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));
    expect(isReadOnly()).toBe(true);

    act(() => resetExecution());
    expect(isReadOnly()).toBe(false);
  });

  it('locks each new run, even after the read-only switch lifted the lock during the one before', () => {
    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    act(() => useStore.getState().setToggleReadOnlyMode(false));
    expect(isReadOnly()).toBe(false);

    act(() => setExecutionStarted('exec-2', '/api/executions/exec-2/stream'));
    expect(isReadOnly()).toBe(true);
  });

  it('locks the canvas for a run restored from its snapshot', () => {
    act(() => applySnapshot({ executionId: 'exec-1', status: 'waiting', lastSequence: 0, events: [] }));

    expect(isReadOnly()).toBe(true);
  });
});

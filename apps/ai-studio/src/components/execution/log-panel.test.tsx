import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { executionEvent as event } from '../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../stores/use-execution-store';
import { ExecutionLogPanel } from './log-panel';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, useSingleSelectedElement: () => null };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ExecutionLogPanel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    resetExecution();
    setExecutionStarted('exec-1', '/stream');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderAfter(...events: ExecutionEvent[]) {
    act(() => {
      for (const entry of events) applyEvent(entry);
      root.render(<ExecutionLogPanel />);
    });
  }

  it('names the outcome, who settled it and where, on the execution completed row', () => {
    renderAfter(
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({
        type: 'execution_completed',
        payload: { outcome: { value: 'rejected', resolvedBy: 'human', nodeId: 'human-1' } },
      }),
    );

    expect(container.textContent).toContain('rejected · resolved by human · human-1');
  });

  it('gives a completed row without an outcome no detail line', () => {
    renderAfter(
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'execution_completed' }),
    );

    expect(container.textContent).toContain('execution completed');
    expect(container.textContent).not.toContain('resolved by');
  });
});

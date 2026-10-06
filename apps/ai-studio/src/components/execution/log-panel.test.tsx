import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExecutionEvent } from '@workflow-builder/types/workflow-execution/execution-events';

import { executionEvent as event } from '../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../stores/use-execution-store';
import { ExecutionLogPanel } from './log-panel';

const sdk = vi.hoisted(() => ({
  selectedNodeId: null as string | null,
  nodes: [] as { id: string; data: { properties: { label?: string } } }[],
  edges: [] as { source: string; target: string }[],
}));

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    useSingleSelectedElement: () => (sdk.selectedNodeId ? { node: { id: sdk.selectedNodeId } } : null),
    useStore: (selector: (state: Pick<typeof sdk, 'nodes' | 'edges'>) => unknown) =>
      selector({ nodes: sdk.nodes, edges: sdk.edges }),
  };
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
    sdk.selectedNodeId = null;
    sdk.nodes = [
      { id: 'classify-1', data: { properties: { label: 'Classify ticket' } } },
      { id: 'region-1', data: { properties: { label: 'Shipping region' } } },
      { id: 'card-1', data: { properties: { label: 'Charge card' } } },
      { id: 'stock-1', data: { properties: { label: 'Reserve stock' } } },
    ];
    sdk.edges = [
      { source: 'classify-1', target: 'card-1' },
      { source: 'classify-1', target: 'stock-1' },
    ];
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

  const nodeRow = (nodeId: string) => container.querySelector(`[data-node-id="${nodeId}"]`);

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

    expect(container.textContent).toContain('Execution completed');
    expect(container.textContent).not.toContain('resolved by');
  });

  it('names a node row by the label from the diagram, not by its id', () => {
    renderAfter(event({ type: 'node_started', nodeId: 'classify-1' }));

    expect(nodeRow('classify-1')?.textContent).toContain('Classify ticket');
    expect(nodeRow('classify-1')?.textContent).not.toContain('classify-1');
  });

  it('falls back to the node id when the diagram no longer has the node', () => {
    renderAfter(event({ type: 'node_started', nodeId: 'gone-1' }));

    expect(nodeRow('gone-1')?.textContent).toContain('gone-1');
  });

  it('shows the run status in the header chip', () => {
    renderAfter(
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'execution_failed', payload: { error: { message: 'boom' } } }),
    );

    expect(container.querySelector('[class*="header"]')?.textContent).toContain('Failed');
  });

  it('marks a failed node row as an error', () => {
    renderAfter(event({ type: 'node_failed', nodeId: 'classify-1', payload: { error: { message: 'boom' } } }));

    expect(nodeRow('classify-1')?.className).toMatch(/row--failed/);
  });

  it('highlights the rows of the node selected on the canvas', () => {
    sdk.selectedNodeId = 'classify-1';
    renderAfter(event({ type: 'node_started', nodeId: 'classify-1' }));

    expect(nodeRow('classify-1')?.className).toMatch(/row--highlighted/);
  });

  it('names the parallel branches a node started, from the diagram', () => {
    renderAfter(event({ type: 'branch_spawned', nodeId: 'classify-1', payload: { childPathIds: ['p1', 'p2'] } }));

    expect(nodeRow('classify-1')?.textContent).toContain('Started 2 parallel branches → Charge card · Reserve stock');
  });

  it('says how many inputs a join received', () => {
    renderAfter(event({ type: 'branches_joined', nodeId: 'stock-1', payload: { mergedPathIds: ['p1', 'p2'] } }));

    expect(nodeRow('stock-1')?.textContent).toContain('Branches joined — 2 inputs arrived · continuing');
  });

  it('tells a skipped row why the node did not run', () => {
    renderAfter(event({ type: 'node_skipped', nodeId: 'card-1', payload: { reason: 'branch_not_taken' } }));

    expect(nodeRow('card-1')?.textContent).toContain('Skipped — branch not taken');
  });

  it('names the step and the output with no connection on an incomplete run', () => {
    renderAfter(
      event({ type: 'execution_started', payload: { workflowId: 'wf-1' } }),
      event({ type: 'execution_incomplete', payload: { deadEnds: [{ nodeId: 'region-1', port: 'Outside EU' }] } }),
    );

    expect(container.textContent).toContain(
      'Shipping region took “Outside EU”, an output with no connection. Draw the missing connection to finish this path.',
    );
    expect(container.querySelector('[class*="header"]')?.textContent).toContain('Incomplete');
  });

  it('keeps the detail on the message line until the row is expanded', () => {
    renderAfter(event({ type: 'node_failed', nodeId: 'classify-1', payload: { error: { message: 'boom' } } }));
    const row = nodeRow('classify-1') as HTMLElement;

    expect(row.textContent).toContain('Failed — boom');
    expect(row.querySelector('[class*="detail"]')).toBeNull();

    act(() => row.click());

    expect(row.querySelector('[class*="detail"]')?.textContent).toBe('boom');
    expect(row.textContent).not.toContain('Failed — boom');
  });
});

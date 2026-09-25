import { useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import type { Select } from '@workflowbuilder/ui';
import { type ComponentProps, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SDK internals by path: the public API mounts these only inside a whole <WorkflowBuilder.Root>.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { NodeProperties } from '../../../../../../packages/sdk/src/features/properties-bar/components/node-properties/node-properties';
import { useRunLocksCanvas } from '../../../hooks/use-run-locks-canvas';
import { humanDecisionNodeType, humanDecisionPaletteItem } from '../../../nodes/human-decision';
import { defaultDecisionRequest } from '../../../nodes/human-decision/default-properties-data';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { decisionFormRenderer } from '../decision-form/decision-form-control';
import { decisionFieldsRenderer } from './decision-fields-control';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

vi.mock('@workflowbuilder/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/ui')>();
  // jsdom cannot drive Base UI's portal; a native select with the same props stands in.
  function NativeSelect({ items, value, onChange, disabled }: ComponentProps<typeof Select>) {
    return (
      <select
        value={value === null || value === undefined ? '' : String(value)}
        disabled={disabled}
        onChange={(changeEvent) => onChange?.(changeEvent, changeEvent.target.value)}
      >
        {items.map((item) =>
          item.type === 'separator' ? null : (
            <option key={String(item.value)} value={String(item.value)}>
              {item.label}
            </option>
          ),
        )}
      </select>
    );
  }
  return { ...actual, Select: NativeSelect };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

registerCustomRenderers([decisionFormRenderer, decisionFieldsRenderer]);

const HUMAN = 'human-1';

const refundOutput = {
  type: 'object',
  properties: {
    refundAmount: { type: 'number', title: 'Refund amount' },
    orderDate: { type: 'string', title: 'Order date' },
    replyDraft: { type: 'string', title: 'Reply draft' },
    internalReasoning: { type: 'string', title: 'Internal reasoning' },
  },
};

function agent(id: string, outputSchema: unknown): WorkflowBuilderNode {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: {
      segments: [],
      properties: { label: id, description: '', systemPrompt: '', webSearch: false, outputSchema },
      type: 'ai-studio/ai-agent',
      icon: 'AiAgent',
    },
  };
}

function human(decisionRequest: unknown): WorkflowBuilderNode {
  return {
    id: HUMAN,
    type: humanDecisionNodeType,
    position: { x: 350, y: 0 },
    data: {
      segments: [],
      properties: { label: 'Review Refund', description: '', decisionRequest },
      type: humanDecisionNodeType,
      icon: 'UserCheck',
    },
  };
}

function edge(source: string): WorkflowBuilderEdge {
  return {
    id: `edge-${source}`,
    source,
    sourceHandle: 'source',
    target: HUMAN,
    targetHandle: 'target',
    type: 'labelEdge',
    data: {},
  };
}

function Host() {
  const node = useStore((state) => state.nodes.find((candidate) => candidate.id === HUMAN));
  return node ? <NodeProperties node={node} /> : null;
}

function RunLock() {
  useRunLocksCanvas();
  return null;
}

const storedProperties = () => useStore.getState().nodes.find((node) => node.id === HUMAN)?.data.properties;
const storedSchema = () => (storedProperties()?.['decisionRequest'] as { schema: unknown }).schema;

// JsonForms debounces onChange by 10 ms.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

describe('the decision fields control in the real properties panel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let dataUpdates = 0;
  let unsubscribe: () => void;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
    dataUpdates = 0;
    unsubscribe = useChangesTrackerStore.subscribe((state) => {
      if (state.lastChangeName === 'dataUpdate') dataUpdates += 1;
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    unsubscribe();
    act(() => root.unmount());
    container.remove();
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
  });

  const rows = () => [...container.querySelectorAll<HTMLElement>('[data-output-field]')];
  const rowKeys = () => rows().map((row) => row.dataset['outputField']);
  const selects = () => rows().map((row) => row.querySelector('select')!);

  async function renderPanel(nodes: WorkflowBuilderNode[], edges: WorkflowBuilderEdge[]) {
    useStore.setState({
      nodes,
      edges,
      selectedNodesIds: [HUMAN],
      selectedEdgesIds: [],
      data: [humanDecisionPaletteItem as never],
    });
    act(() => root.render(<Host />));
    await settle();
  }

  const renderRefund = (decisionRequest: unknown = defaultDecisionRequest) =>
    renderPanel([agent('draft-1', refundOutput), human(decisionRequest)], [edge('draft-1')]);

  async function choose(key: string, mode: string) {
    const select = container.querySelector<HTMLSelectElement>(`[data-output-field="${key}"] select`);
    if (!select) throw new Error(`no dropdown for ${key}`);
    act(() => {
      select.value = mode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await settle();
  }

  it("lists the source's fields in its order, every one Hidden on a node fresh from the palette", async () => {
    await renderRefund();

    expect(rowKeys()).toEqual(['refundAmount', 'orderDate', 'replyDraft', 'internalReasoning']);
    expect(selects().map((select) => select.value)).toEqual(Array.from({ length: 4 }, () => 'hidden'));
  });

  it('a pick is one undo step and stores the contract shape, leaving the rest of the node alone', async () => {
    await renderRefund();

    await choose('orderDate', 'readOnly');

    expect(dataUpdates).toBe(1);
    expect(storedSchema()).toEqual({
      type: 'object',
      properties: { orderDate: { type: 'string', title: 'Order date', readOnly: true } },
    });
    expect((storedProperties()?.['decisionRequest'] as typeof defaultDecisionRequest).actions).toBe(
      defaultDecisionRequest.actions,
    );
    expect(storedProperties()?.['label']).toBe('Review Refund');
  });

  // Base UI reports a click on the selected item as a change; the stored entry lacks the source's title on purpose.
  it('picking the mode a row already shows writes nothing', async () => {
    await renderRefund({
      ...defaultDecisionRequest,
      schema: { type: 'object', properties: { orderDate: { type: 'string', readOnly: true } } },
    });

    await choose('orderDate', 'readOnly');

    expect(dataUpdates).toBe(0);
  });

  it('locks the dropdowns while a run is alive, though nothing else disables the panel', async () => {
    await renderRefund();

    act(() => {
      setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
      applyEvent(event({ type: 'node_started', nodeId: 'draft-1' }));
    });
    expect(selects().every((select) => select.disabled)).toBe(true);

    act(() => applyEvent(event({ type: 'execution_completed' })));
    expect(selects().every((select) => !select.disabled)).toBe(true);
  });

  it('locks the dropdowns while the canvas is in the app bar read-only mode', async () => {
    await renderRefund();

    act(() => useStore.getState().setToggleReadOnlyMode(true));
    expect(selects().every((select) => select.disabled)).toBe(true);

    act(() => useStore.getState().setToggleReadOnlyMode(false));
    expect(selects().every((select) => !select.disabled)).toBe(true);
  });

  it('steps aside while this node waits and comes back after Reset', async () => {
    await renderRefund();

    act(() => {
      setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
      applyEvent(event({ type: 'node_waiting', nodeId: HUMAN }));
    });
    expect(rows()).toHaveLength(0);

    act(() => resetExecution());
    expect(rows()).toHaveLength(4);
  });

  it('comes back beside the settled decision and stays locked until Reset', async () => {
    await renderRefund();
    act(() =>
      root.render(
        <>
          <RunLock />
          <Host />
        </>,
      ),
    );

    act(() => {
      setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
      applyEvent(event({ type: 'node_waiting', nodeId: HUMAN }));
      applyEvent(
        event({
          type: 'node_completed',
          nodeId: HUMAN,
          payload: { output: { action: 'approve', effect: 'resume', resolvedBy: 'human' } },
        }),
      );
      applyEvent(event({ type: 'execution_completed' }));
    });
    expect(rows()).toHaveLength(4);
    expect(selects().every((select) => select.disabled)).toBe(true);

    act(() => resetExecution());
    expect(selects().every((select) => !select.disabled)).toBe(true);
  });

  it('with two predecessors, lists the fields of the declared proposal source', async () => {
    const summaryOutput = { type: 'object', properties: { summary: { type: 'string', title: 'Summary' } } };

    await renderPanel(
      [
        agent('draft-1', refundOutput),
        agent('draft-2', summaryOutput),
        human({ ...defaultDecisionRequest, proposalSourceNodeId: 'draft-2' }),
      ],
      [edge('draft-1'), edge('draft-2')],
    );

    expect(rowKeys()).toEqual(['summary']);
  });

  it('without one source, says how to get fields and keeps listing the stored ones', async () => {
    const stored = {
      ...defaultDecisionRequest,
      schema: { type: 'object', properties: { replyDraft: { type: 'string', title: 'Reply draft' } } },
    };

    await renderPanel(
      [agent('draft-1', refundOutput), agent('draft-2', refundOutput), human(stored)],
      [edge('draft-1'), edge('draft-2')],
    );

    expect(container.textContent).toContain('Connect one node before this one whose Response format');
    expect(rows().map((row) => row.querySelector('span')?.textContent)).toEqual(['Reply draft (not in the source)']);
  });
});

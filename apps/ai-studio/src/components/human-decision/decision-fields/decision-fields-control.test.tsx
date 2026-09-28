import { useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import type { Select } from '@workflowbuilder/ui';
import { type ComponentProps, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SDK internals by path: the public API mounts these only inside a whole <WorkflowBuilder.Root>.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { NodeProperties } from '../../../../../../packages/sdk/src/features/properties-bar/components/node-properties/node-properties';
// The real receivers, not copies, as in ../../../nodes/human-decision/decision-request-contract.test.ts
// (follow-up: decision-request-contract-test-home).
import { decisionRequestSchema } from '../../../../../backend/src/domain/decision/decision-request-schema';
import { findDecisionRequest } from '../../../../../backend/src/domain/decision/find-decision-request';
import { validateSubmittedDecision } from '../../../../../backend/src/domain/decision/validate-submitted-decision';
import { workflowSnapshotSchema } from '../../../../../backend/src/domain/mapper/snapshot-schema';
import { refundReviewFlow, refundReviewRequest } from '../../../data/refund-review-flow';
import { useRunLocksCanvas } from '../../../hooks/use-run-locks-canvas';
import { humanDecisionNodeType, humanDecisionPaletteItem } from '../../../nodes/human-decision';
import { defaultDecisionRequest } from '../../../nodes/human-decision/default-properties-data';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import {
  applyConnectionLost,
  applyEvent,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../../../stores/use-execution-store';
import { FIELD_MODES } from '../../../utils/human-decision/decision-fields';
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
const runStatus = () => useExecutionStore.getState().status;
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
  const sectionHeader = () =>
    [...container.querySelectorAll('[aria-expanded]')].find(
      (element) => element.textContent === 'Fields the decider sees',
    );
  // A row of the decider's form is found by its label, the way a person finds it.
  const formField = (label: string) =>
    [...container.querySelectorAll('[data-decision-form] span')]
      .find((span) => span.childElementCount === 0 && span.textContent === label)
      ?.parentElement?.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ??
    undefined;

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

  it('locks the dropdowns while the canvas is in the app bar read-only mode', async () => {
    await renderRefund();

    act(() => useStore.getState().setToggleReadOnlyMode(true));
    expect(selects().every((select) => select.disabled)).toBe(true);

    act(() => useStore.getState().setToggleReadOnlyMode(false));
    expect(selects().every((select) => !select.disabled)).toBe(true);
  });

  it('steps aside from Run until Reset, section header included, even with the canvas lock lifted', async () => {
    await renderRefund();
    act(() =>
      root.render(
        <>
          <RunLock />
          <Host />
        </>,
      ),
    );
    expect(sectionHeader()).toBeDefined();

    act(() => setExecutionStarted('exec-1', '/api/executions/exec-1/stream'));
    expect(runStatus()).toBe('pending');
    expect(sectionHeader()).toBeUndefined();

    act(() => useStore.getState().setToggleReadOnlyMode(false));
    act(() => applyEvent(event({ type: 'node_waiting', nodeId: HUMAN })));
    expect(sectionHeader()).toBeUndefined();

    act(() => applyConnectionLost());
    expect(runStatus()).toBe('disconnected');
    expect(sectionHeader()).toBeUndefined();

    act(() => {
      applyEvent(
        event({
          type: 'node_completed',
          nodeId: HUMAN,
          payload: { output: { action: 'approve', effect: 'resume', resolvedBy: 'human' } },
        }),
      );
      applyEvent(event({ type: 'execution_completed' }));
    });
    expect(sectionHeader()).toBeUndefined();

    act(() => resetExecution());
    expect(rows()).toHaveLength(4);
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

  const stored = {
    ...defaultDecisionRequest,
    schema: { type: 'object', properties: { replyDraft: { type: 'string', title: 'Reply draft' } } },
  };
  const rowLabels = () => rows().map((row) => row.querySelector('span')?.textContent);

  it('with nothing connected, says to connect a block and keeps listing the stored fields', async () => {
    await renderPanel([agent('draft-1', refundOutput), human(stored)], []);

    expect(container.textContent).toContain('Connect a block before this one');
    expect(container.textContent).not.toContain('declares no output fields');
    expect(rowLabels()).toEqual(['Reply draft (not in the source)']);
  });

  it('with two predecessors and no declared source, says several blocks lead in and lists the stored fields', async () => {
    await renderPanel(
      [agent('draft-1', refundOutput), agent('draft-2', refundOutput), human(stored)],
      [edge('draft-1'), edge('draft-2')],
    );

    expect(container.textContent).toContain('Several blocks lead into this one');
    expect(container.textContent).not.toContain('Connect a block before this one');
    expect(container.textContent).not.toContain('declares no output fields');
    expect(rowLabels()).toEqual(['Reply draft (not in the source)']);
  });

  it('a declared source that is not a predecessor is not read: with another block connected, no hint', async () => {
    const ghost = { ...refundReviewRequest, proposalSourceNodeId: 'ghost' };
    await renderPanel([agent('draft-1', refundOutput), human(ghost)], [edge('draft-1')]);

    expect(container.textContent).not.toContain('declares no output fields');
    expect(container.textContent).not.toContain('Connect a block before this one');
    expect(rowLabels()).toEqual([
      'Refund amount (not in the source)',
      'Order date (not in the source)',
      'Reply draft (not in the source)',
    ]);
  });

  it('a declared source that is not a predecessor is not read: with nothing connected, the unconnected hint', async () => {
    const ghost = { ...refundReviewRequest, proposalSourceNodeId: 'ghost' };
    await renderPanel([agent('draft-1', refundOutput), human(ghost)], []);

    expect(container.textContent).toContain('Connect a block before this one');
    expect(container.textContent).not.toContain('declares no output fields');
  });

  describe('on the "Refund Review" template', () => {
    const template = refundReviewFlow.value.diagram;
    const renderTemplate = (nodes: WorkflowBuilderNode[] = template.nodes) => renderPanel(nodes, template.edges);

    // What the backend answers at decision time: the snapshot the run carries, then the submitted edits.
    function answerTo(edits: Record<string, unknown>): string {
      const { nodes, edges } = useStore.getState();
      const parsed = workflowSnapshotSchema.safeParse(structuredClone({ nodes, edges }));
      if (!parsed.success) throw new Error(`snapshot refused: ${JSON.stringify(parsed.error.issues)}`);
      const found = findDecisionRequest(parsed.data, HUMAN);
      if (found.error !== undefined) throw new Error(found.error);
      return validateSubmittedDecision(found.request, { action: 'approve', edits }).error?.code ?? 'accepted';
    }

    const edit: Record<string, unknown> = {
      refundAmount: 40,
      orderDate: '2026-09-01',
      replyDraft: 'Hi',
      internalReasoning: 'Why',
    };
    const ANSWER = {
      hidden: 'unknown_field',
      readOnly: 'field_not_editable',
      editable: 'accepted',
      required: 'accepted',
    };
    const templateOutput = {
      refundAmount: 49,
      orderDate: '2026-09-02',
      replyDraft: 'Hi Marcus, we refunded the duplicate charge.',
      internalReasoning: 'Duplicate charge, refunded in full.',
    };

    it("lists the draft's four fields under their titles, in the draft's order, with the template's picks", async () => {
      await renderTemplate();

      expect(rowLabels()).toEqual(['Refund amount', 'Order date', 'Reply draft', 'Internal reasoning']);
      expect(selects().map((select) => select.value)).toEqual(['required', 'readOnly', 'editable', 'hidden']);
      expect(container.textContent).not.toContain('declares no output fields');
    });

    it('as shipped, the backend refuses an edit to the read-only and the hidden field and takes the rest', async () => {
      await renderTemplate();

      expect(answerTo({ refundAmount: 40 })).toBe('accepted');
      expect(answerTo({ orderDate: '2026-09-01' })).toBe('field_not_editable');
      expect(answerTo({ replyDraft: 'Hi' })).toBe('accepted');
      expect(answerTo({ internalReasoning: 'Why' })).toBe('unknown_field');
    });

    it.each(Object.keys(edit).flatMap((key) => FIELD_MODES.map((mode) => [key, mode] as const)))(
      '%s picked %s stores a request the backend takes, and an edit to it gets the answer the pick promises',
      async (key, mode) => {
        await renderTemplate();

        await choose(key, mode);

        const request = storedProperties()?.['decisionRequest'];
        const parsed = decisionRequestSchema.safeParse(request);
        expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
        expect(answerTo({ [key]: edit[key] })).toBe(ANSWER[mode]);
      },
    );

    it('a pick leaves the template itself as it was, for the next time it is opened', async () => {
      await renderTemplate();

      await choose('orderDate', 'editable');
      await choose('internalReasoning', 'readOnly');

      expect(storedProperties()?.['decisionRequest']).not.toBe(refundReviewRequest);
      expect(refundReviewRequest.schema).toEqual({
        type: 'object',
        properties: {
          refundAmount: { type: 'number', title: 'Refund amount' },
          orderDate: { type: 'string', title: 'Order date', readOnly: true },
          replyDraft: { type: 'string', title: 'Reply draft' },
        },
        required: ['refundAmount'],
      });
    });

    it("a pick made before Run is the decider's form: a Hidden field is absent, a Read-only one disabled", async () => {
      await renderTemplate();
      await choose('replyDraft', 'hidden');
      await choose('internalReasoning', 'readOnly');

      act(() => {
        setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
        applyEvent(event({ type: 'node_completed', nodeId: 'draft-1', payload: { output: templateOutput } }));
        applyEvent(event({ type: 'node_waiting', nodeId: HUMAN }));
      });
      await settle();

      expect(container.querySelector('[data-decision-form]')).not.toBeNull();
      expect(formField('Reply draft')).toBeUndefined();
      expect(formField('Internal reasoning')?.value).toBe('Duplicate charge, refunded in full.');
      expect(formField('Internal reasoning')?.disabled).toBe(true);
      expect(formField('Order date')?.disabled).toBe(true);
      expect(formField('Refund amount')?.value).toBe('49');
      expect(formField('Refund amount')?.disabled).toBe(false);
    });

    const withDraftProperties = (change: (properties: Record<string, unknown>) => Record<string, unknown>) =>
      template.nodes.map((node) =>
        node.id === 'draft-1' ? { ...node, data: { ...node.data, properties: change(node.data.properties) } } : node,
      );

    it('with the draft on Plain text, says it declares no fields and keeps listing the stored ones', async () => {
      await renderTemplate(withDraftProperties((properties) => ({ ...properties, outputSchema: undefined })));

      expect(container.textContent).toContain('declares no output fields');
      expect(container.textContent).not.toContain('Connect a block before this one');
      expect(rowLabels()).toEqual([
        'Refund amount (not in the source)',
        'Order date (not in the source)',
        'Reply draft (not in the source)',
      ]);
    });

    it('with a draft that still declares one of the stored fields, marks the others and gives no hint', async () => {
      const amountOnly = { type: 'object', properties: { refundAmount: { type: 'number', title: 'Refund amount' } } };

      await renderTemplate(withDraftProperties((properties) => ({ ...properties, outputSchema: amountOnly })));

      expect(container.textContent).not.toContain('declares no output fields');
      expect(rowLabels()).toEqual([
        'Refund amount',
        'Order date (not in the source)',
        'Reply draft (not in the source)',
      ]);
    });
  });
});

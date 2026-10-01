import { getHandleId, registerFunctionDecorator, useChangesTrackerStore, useStore } from '@workflowbuilder/sdk';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SDK internals by path: the public API mounts these only inside a whole <WorkflowBuilder.Root>.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { NodeProperties } from '../../../../../../packages/sdk/src/features/properties-bar/components/node-properties/node-properties';
// The real receiver, not a copy, as in ../../../nodes/human-decision/decision-request-contract.test.ts
// (follow-up: decision-request-contract-test-home).
import { decisionRequestSchema } from '../../../../../backend/src/domain/decision/decision-request-schema';
import { refundReviewFlow } from '../../../data/refund-review-flow';
import { useRunLocksCanvas } from '../../../hooks/use-run-locks-canvas';
import { humanDecisionNodeType, humanDecisionPaletteItem } from '../../../nodes/human-decision';
import { defaultDecisionRequest, defaultRejectAction } from '../../../nodes/human-decision/default-properties-data';
import { trackFutureChangeDecorator } from '../../../plugins/undo-redo/functions/decorators';
import { undo, useUndoRedoStore } from '../../../plugins/undo-redo/stores/use-undo-redo-store';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { decisionFieldsRenderer } from '../decision-fields/decision-fields-control';
import { decisionFormRenderer } from '../decision-form/decision-form-control';
import { OUTPUT_HINTS, decisionActionsRenderer } from './decision-actions-control';

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return { ...actual, Icon: ({ name }: { name: string }) => <i data-icon={name} /> };
});

registerCustomRenderers([decisionFormRenderer, decisionFieldsRenderer, decisionActionsRenderer]);
registerFunctionDecorator('trackFutureChange', { callback: trackFutureChangeDecorator, name: 'undoRedo' });

const HUMAN = 'human-1';
const REJECTED = getHandleId({ handleType: 'source', innerId: 'rejected' });

const [approveAction] = defaultDecisionRequest.actions;
const withoutReject = { ...defaultDecisionRequest, actions: [approveAction] };

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

function edgeFrom(sourceHandle: string): WorkflowBuilderEdge {
  return {
    id: `edge-${sourceHandle}`,
    source: HUMAN,
    sourceHandle,
    target: 'next-1',
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

const storedRequest = () =>
  useStore.getState().nodes.find((node) => node.id === HUMAN)?.data.properties['decisionRequest'] as
    | typeof defaultDecisionRequest
    | undefined;

// JsonForms debounces onChange by 10 ms.
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });

describe('the decider actions control in the real properties panel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let trackedChanges = 0;
  let unsubscribe: () => void;

  beforeEach(() => {
    useStore.setState(useStore.getInitialState(), true);
    resetExecution();
    useUndoRedoStore.setState({ past: [], future: [], snapshotsWatchers: {} });
    trackedChanges = 0;
    unsubscribe = useChangesTrackerStore.subscribe(() => {
      trackedChanges += 1;
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

  async function renderPanel(nodes: WorkflowBuilderNode[], edges: WorkflowBuilderEdge[] = []) {
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

  const row = (action: string) => container.querySelector<HTMLElement>(`[data-decider-action="${action}"]`);
  const toggle = (action: string) => row(action)?.querySelector<HTMLElement>('[role="switch"]') ?? null;
  const isOn = (action: string) => toggle(action)?.getAttribute('aria-checked') === 'true';
  const checkbox = (action: string) => row(action)?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const nameOf = (action: string) => {
    const id = toggle(action)?.getAttribute('aria-labelledby') ?? '';
    return container.querySelector(`[id="${id}"]`)?.textContent;
  };
  const descriptionOf = (action: string) => {
    const id = toggle(action)?.getAttribute('aria-describedby');
    return id ? container.querySelector(`[id="${id}"]`)?.textContent : undefined;
  };
  const hints = () =>
    [...container.querySelectorAll<HTMLElement>('[data-decider-actions] [data-hint]')].map((hint) => ({
      variant: hint.dataset['hint'],
      text: hint.textContent,
    }));
  const sectionHeader = () =>
    [...container.querySelectorAll('[aria-expanded]')].find((element) => element.textContent === 'Decider actions');

  // The switch forwards a click to a hidden checkbox; jsdom does not run that forwarding, so the test clicks it.
  async function flip(action: string) {
    const target = checkbox(action);
    if (!target) throw new Error(`no switch for ${action}`);
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();
  }

  it('sits under the fields the decider sees', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    const headers = [...container.querySelectorAll('[aria-expanded]')].map((element) => element.textContent);
    expect(headers.indexOf('Decider actions')).toBe(headers.indexOf('Fields the decider sees') + 1);
  });

  it('on a node fresh from the palette: Approve always on, Reject on, a reason required, no path from Rejected', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    expect(row('approve')?.textContent).toBe('ApproveAlways on');
    expect(toggle('approve')).toBeNull();
    expect(isOn('reject')).toBe(true);
    expect(row('reject')?.textContent).not.toContain('single output');
    expect(descriptionOf('reject')).toBeUndefined();
    expect(isOn('reasonRequired')).toBe(true);
    expect(row('reasonRequired')?.textContent).not.toContain('optional');
    expect(descriptionOf('reasonRequired')).toBeUndefined();
    expect(hints()).toEqual([OUTPUT_HINTS.unwired]);
    expect(container.querySelector('[data-decider-actions] [data-hint]')?.getAttribute('role')).toBe('status');
  });

  it('names each switch after its row', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    expect(nameOf('reject')).toBe('Reject');
    expect(nameOf('reasonRequired')).toBe('Reason required');
  });

  it('with an edge from the Rejected port, says both outputs carry equal weight', async () => {
    await renderPanel([human(defaultDecisionRequest)], [edgeFrom(REJECTED)]);

    expect(hints()).toEqual([OUTPUT_HINTS.wired]);
  });

  it('an edge from the Approved port alone leaves Rejected without a path', async () => {
    await renderPanel([human(defaultDecisionRequest)], [edgeFrom(approveAction.port)]);

    expect(hints()).toEqual([OUTPUT_HINTS.unwired]);
  });

  it('turning Reject off is one undo step: the request keeps Approve alone and the rest as it was', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    await flip('reject');

    expect(trackedChanges).toBe(1);
    expect(storedRequest()?.actions).toEqual([approveAction]);
    expect(storedRequest()?.schema).toBe(defaultDecisionRequest.schema);
    expect(isOn('reject')).toBe(false);
    expect(row('reject')?.textContent).toContain('single output');
    expect(descriptionOf('reject')).toBe('single output');
    expect(row('reasonRequired')).toBeNull();
    expect(hints()).toEqual([OUTPUT_HINTS.single]);

    act(() => undo());
    await settle();

    expect(storedRequest()?.actions).toEqual(defaultDecisionRequest.actions);
    expect(isOn('reject')).toBe(true);
    expect(useUndoRedoStore.getState().past).toEqual([]);
  });

  it('turning Reject on is one undo step and adds it back on the fixed Rejected port, a reason required', async () => {
    await renderPanel([human(withoutReject)]);

    await flip('reject');

    expect(trackedChanges).toBe(1);
    expect(storedRequest()?.actions).toEqual([approveAction, defaultRejectAction]);
    expect(storedRequest()?.actions[1]).toMatchObject({ port: REJECTED, reasonRequired: true });
    expect(isOn('reasonRequired')).toBe(true);
    expect(hints()).toEqual([OUTPUT_HINTS.unwired]);
  });

  it('Reason required off is one undo step, stores it and notes the reason is optional; on again requires it', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    await flip('reasonRequired');

    expect(trackedChanges).toBe(1);
    expect(storedRequest()?.actions[1]).toEqual({ ...defaultRejectAction, reasonRequired: false });
    expect(isOn('reasonRequired')).toBe(false);
    expect(row('reasonRequired')?.textContent).toContain('optional');
    expect(descriptionOf('reasonRequired')).toBe('optional');

    await flip('reasonRequired');

    expect(trackedChanges).toBe(2);
    expect(storedRequest()?.actions[1]).toEqual(defaultRejectAction);
  });

  it.each([
    ['Reject off', 'reject', defaultDecisionRequest],
    ['Reject on', 'reject', withoutReject],
    ['Reason required off', 'reasonRequired', defaultDecisionRequest],
  ] as const)('%s stores a request the backend takes', async (_name, action, request) => {
    await renderPanel([human(request)]);

    await flip(action);

    const parsed = decisionRequestSchema.safeParse(storedRequest());
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it('on the "Refund Review" template, Rejected has a path, and turning Reject off keeps the request valid', async () => {
    const { nodes, edges } = refundReviewFlow.value.diagram;
    await renderPanel(nodes, edges);

    expect(hints()).toEqual([OUTPUT_HINTS.wired]);

    await flip('reject');

    expect(decisionRequestSchema.safeParse(storedRequest()).success).toBe(true);
    expect(hints()).toEqual([OUTPUT_HINTS.single]);
  });

  it.todo('turning Reject off removes the Rejected edge in the same undo step');
  it.todo('turning Reject on again brings the Rejected port back without its old edge');

  it('locks the switches while the canvas is in the app bar read-only mode', async () => {
    await renderPanel([human(defaultDecisionRequest)]);

    act(() => useStore.getState().setToggleReadOnlyMode(true));
    expect(toggle('reject')?.hasAttribute('data-disabled')).toBe(true);
    expect(toggle('reasonRequired')?.hasAttribute('data-disabled')).toBe(true);
    expect(checkbox('reject')?.disabled).toBe(true);

    act(() => useStore.getState().setToggleReadOnlyMode(false));
    expect(toggle('reject')?.hasAttribute('data-disabled')).toBe(false);
    expect(checkbox('reject')?.disabled).toBe(false);
  });

  it('steps aside from Run until Reset, section header included, even with the canvas lock lifted', async () => {
    await renderPanel([human(defaultDecisionRequest)]);
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
    expect(sectionHeader()).toBeUndefined();

    act(() => useStore.getState().setToggleReadOnlyMode(false));
    act(() => applyEvent(event({ type: 'node_waiting', nodeId: HUMAN })));
    expect(sectionHeader()).toBeUndefined();

    act(() => applyEvent(event({ type: 'execution_completed' })));
    expect(sectionHeader()).toBeUndefined();

    act(() => resetExecution());
    expect(sectionHeader()).toBeDefined();
    expect(isOn('reject')).toBe(true);
  });

  it('renders nothing for a request without a resume action', async () => {
    await renderPanel([human({ ...defaultDecisionRequest, actions: [defaultRejectAction] })]);

    expect(sectionHeader()).toBeUndefined();
  });
});

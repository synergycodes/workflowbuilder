import type { ControlProps } from '@workflowbuilder/sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uischema } from '../../../nodes/human-decision/uischema';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { DecisionFormControl, decisionFormRenderer } from './decision-form-control';
import { reviewRequest } from './review-request.fixture';

// The sidebar renders for the single selected node; the test moves the selection by hand.
const selection: { nodeId: string | undefined } = { nodeId: 'human-1' };
const edges = [
  { id: 'e1', source: 'draft-1', target: 'human-1' },
  { id: 'e2', source: 'human-1', target: 'send-1' },
  { id: 'e3', source: 'draft-2', target: 'human-2' },
];

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    useSingleSelectedElement: () =>
      selection.nodeId === undefined ? null : { node: { id: selection.nodeId }, edge: null },
    useStore: (selector: (state: { edges: typeof edges }) => unknown) => selector({ edges }),
  };
});

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const draftOutput = {
  refundAmount: 80,
  orderDate: '2026-09-01',
  replyDraft: 'Dear customer',
  internalReasoning: 'hidden',
};

function parkHumanOne() {
  act(() => {
    applyEvent(event({ type: 'node_completed', nodeId: 'draft-1', payload: { output: draftOutput } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
  });
}

function typeInto(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, text);
  act(() => {
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('DecisionFormControl', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const handleChange = vi.fn();

  const render = (data: unknown = reviewRequest) =>
    act(() =>
      root.render(
        <DecisionFormControl
          {...({ data, handleChange, path: 'properties.decisionRequest' } as unknown as ControlProps)}
        />,
      ),
    );

  beforeEach(() => {
    resetExecution();
    selection.nodeId = 'human-1';
    handleChange.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => setExecutionStarted('exec-1', 'http://backend/stream'));
    render();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const form = () => container.querySelector('[data-decision-form]');
  const fieldKeys = () =>
    [...container.querySelectorAll<HTMLElement>('[data-decision-field]')].map((row) => row.dataset['decisionField']);
  const inputOf = (key: string) =>
    container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `[data-decision-field="${key}"] input, [data-decision-field="${key}"] textarea`,
    );

  // The element on the node and the tester that claims it are written apart; a rename of one is silent.
  it('claims exactly one element of the node uischema', () => {
    const elements = (uischema as unknown as { elements: unknown[] }).elements;
    const ranks = elements.map((element) => decisionFormRenderer.tester(element as never, {} as never, {} as never));

    expect(ranks.filter((rank) => rank > 0)).toHaveLength(1);
  });

  it('renders nothing until the node waits, then the fields of the request', () => {
    expect(form()).toBeNull();

    parkHumanOne();

    expect(fieldKeys()).toEqual(['refundAmount', 'orderDate', 'replyDraft', 'tags']);
    expect(container.textContent).not.toContain('internalReasoning');
  });

  it('fills the fields from the proposal source output and disables the read-only one', () => {
    parkHumanOne();

    expect(inputOf('refundAmount')?.value).toBe('80');
    expect(inputOf('orderDate')?.value).toBe('2026-09-01');
    expect(inputOf('orderDate')?.disabled).toBe(true);
    expect(inputOf('replyDraft')?.value).toBe('Dear customer');
    expect(inputOf('replyDraft')?.disabled).toBe(false);
  });

  it('keeps the typed value in local state and never writes the diagram', () => {
    parkHumanOne();

    typeInto(inputOf('refundAmount')!, '120');

    expect(inputOf('refundAmount')?.value).toBe('120');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('disappears when the node completes', () => {
    parkHumanOne();
    act(() =>
      applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: { action: 'approve' } } })),
    );

    expect(form()).toBeNull();
  });

  it('disappears when the run is cancelled while parked', () => {
    parkHumanOne();
    act(() => applyEvent(event({ type: 'execution_cancelled', payload: {} })));

    expect(form()).toBeNull();
  });

  it('renders nothing for a node whose properties carry no well-formed request', () => {
    parkHumanOne();
    render({ actions: 'approve' });

    expect(form()).toBeNull();
  });

  it('starts over with the other node values when the selection moves, and again when it comes back', () => {
    parkHumanOne();
    act(() => {
      applyEvent(event({ type: 'node_completed', nodeId: 'draft-2', payload: { output: { refundAmount: 15 } } }));
      applyEvent(event({ type: 'node_waiting', nodeId: 'human-2' }));
    });
    typeInto(inputOf('refundAmount')!, '120');

    selection.nodeId = 'human-2';
    render();
    expect(inputOf('refundAmount')?.value).toBe('15');

    selection.nodeId = 'human-1';
    render();
    expect(inputOf('refundAmount')?.value).toBe('80');
  });

  it('says so when the request declares no fields', () => {
    parkHumanOne();
    render({ ...reviewRequest, schema: { type: 'object', properties: {} } });

    expect(form()).toBeNull();
    expect(container.textContent).toContain('no fields to review');
  });
});

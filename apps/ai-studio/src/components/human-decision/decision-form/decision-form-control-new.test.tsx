import { type ComponentProps, Fragment, type ReactNode, StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The editor's real form, so the decision form runs with the controls and validator the panel gives it.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { JSONForm } from '../../../../../../packages/sdk/src/features/json-form/json-form';
import { submitDecision } from '../../../adapters/submit-decision';
import { defaultDecisionRequest } from '../../../nodes/human-decision/default-properties-data';
import { schema as nodeSchema } from '../../../nodes/human-decision/schema';
import { uischema as nodeUischema } from '../../../nodes/human-decision/uischema';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import { applyEvent, resetExecution, setExecutionStarted } from '../../../stores/use-execution-store';
import { decisionFormRendererNew } from './decision-form-control-new';

// The sidebar renders for the single selected node; the test moves the selection by hand, and the node's properties are
// the data it last rendered.
const selection: { nodeId: string | undefined; properties: unknown } = { nodeId: 'human-1', properties: undefined };

vi.mock('@workflowbuilder/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@workflowbuilder/sdk')>();
  return {
    ...actual,
    useSingleSelectedElement: () =>
      selection.nodeId === undefined
        ? null
        : { node: { id: selection.nodeId, data: { properties: selection.properties } }, edge: null },
    // Rendered in place: without the properties panel the real one has no footer to render into.
    PropertiesPanelFooter: ({ children }: { children?: ReactNode }) => (
      <div data-properties-panel-footer>{children}</div>
    ),
  };
});

vi.mock('../../../adapters/submit-decision', () => ({ submitDecision: vi.fn() }));
const submit = vi.mocked(submitDecision);

registerCustomRenderers([decisionFormRendererNew]);

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const picks = [
  { label: 'Refund amount', reference: '{{nodes.draft-1.refundAmount}}', type: 'number' },
  { label: 'Reply draft', reference: '{{nodes.draft-1.replyDraft}}', type: 'string' },
  { label: 'Expedite', reference: '{{nodes.draft-1.expedite}}', type: 'boolean' },
  { label: 'Order date', reference: '{{nodes.draft-1.orderDate}}', type: 'date' },
  { label: 'Tags', reference: '{{nodes.draft-1.tags}}', type: 'array' },
];

const draftOutput = {
  refundAmount: 80,
  replyDraft: 'Dear customer',
  expedite: false,
  orderDate: '2026-09-01',
  tags: ['vip'],
  internalReasoning: 'hidden',
};

const humanOneWait = { executionId: 'exec-1', nodeId: 'human-1', attempt: 1 };

function parkHumanOne(output: unknown = draftOutput) {
  act(() => {
    applyEvent(event({ type: 'node_completed', nodeId: 'draft-1', payload: { output } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
  });
}

function decideHumanOne(output: unknown) {
  act(() => applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output } })));
}

// The editor's text controls keep the typing locally and hand the value over on blur.
function commit(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, text);
  act(() => {
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  act(() => {
    element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

// JsonForms reports a change after a short debounce; the buttons follow that report.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe.each([
  ['in development', StrictMode],
  ['without StrictMode, as a production build mounts', Fragment],
])('the decision form built from the picked variables, %s', (_mode, Mode) => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  const render = (editableFields: unknown = picks, decisionRequest: unknown = defaultDecisionRequest) => {
    const data = { label: 'Review Refund', description: '', decisionRequest, readOnlyFields: [], editableFields };
    selection.properties = data;
    act(() =>
      root.render(
        <Mode>
          <JSONForm
            schema={nodeSchema}
            uischema={nodeUischema as ComponentProps<typeof JSONForm>['uischema']}
            data={data}
            onChange={() => {}}
          />
        </Mode>,
      ),
    );
  };

  beforeEach(() => {
    resetExecution();
    selection.nodeId = 'human-1';
    submit.mockReset();
    submit.mockResolvedValue({ ok: true });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => setExecutionStarted('exec-1', 'http://backend/stream'));
    render();
  });

  afterEach(async () => {
    await settle();
    act(() => root.unmount());
    container.remove();
  });

  const form = () => container.querySelector('[data-decision-form]');
  const record = () => container.querySelector('[data-decision-record]');
  // A row is found by its label, the way a person finds it, inside the decision: the picks list above shows the same labels.
  const labelled = (label: string) =>
    [...(form() ?? record())!.querySelectorAll('span')].find(
      (span) => span.childElementCount === 0 && span.textContent === label,
    )?.parentElement?.parentElement ?? undefined;
  const fieldOf = (label: string) =>
    labelled(label)?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ?? undefined;
  const valueOf = (label: string) => labelled(label)?.querySelector('p')?.textContent ?? undefined;
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === label)!;

  it('renders nothing until the node waits, then one field per pick the editor can show', () => {
    expect(form()).toBeNull();

    parkHumanOne();

    expect(form()).not.toBeNull();
    for (const label of ['Refund amount', 'Reply draft', 'Expedite', 'Order date']) {
      expect(labelled(label), label).toBeDefined();
    }
    expect(labelled('Tags')).toBeUndefined();
    expect(container.textContent).not.toContain('internalReasoning');
  });

  it('fills the fields from the outputs the picks reference, a date as text', () => {
    parkHumanOne();

    expect(fieldOf('Refund amount')?.value).toBe('80');
    expect(fieldOf('Reply draft')?.value).toBe('Dear customer');
    expect(fieldOf('Order date')?.value).toBe('2026-09-01');
    expect(fieldOf('Refund amount')?.disabled).toBe(false);
  });

  it('renders nothing for a node whose properties carry no well-formed request', () => {
    parkHumanOne();
    render(picks, { actions: 'approve' });

    expect(form()).toBeNull();
  });

  it('still lets the person decide when nothing is picked', async () => {
    render([]);
    parkHumanOne();

    await click(button('Approve'));

    expect(submit).toHaveBeenCalledWith(humanOneWait, { action: 'approve', edits: {} });
  });

  it('sends the edits keyed by the field key, for the wait the node is on', async () => {
    parkHumanOne();
    commit(fieldOf('Refund amount')!, '120');
    commit(fieldOf('Reply draft')!, 'Dear customer, refunded.');

    await click(button('Approve'));

    expect(submit).toHaveBeenCalledWith(humanOneWait, {
      action: 'approve',
      edits: { 'nodes/draft-1/refundAmount': 120, 'nodes/draft-1/replyDraft': 'Dear customer, refunded.' },
    });
  });

  it('holds back Approve while a picked field is emptied', async () => {
    parkHumanOne();

    commit(fieldOf('Refund amount')!, '');
    await settle();

    expect(button('Approve').disabled).toBe(true);
    expect(button('Reject…').disabled).toBe(false);
  });

  it('shows the approved values read-only once the run moves on', () => {
    parkHumanOne();
    decideHumanOne({
      action: 'approve',
      effect: 'resume-with-edits',
      edits: { 'nodes/draft-1/refundAmount': 120 },
      resolvedBy: 'human',
    });

    expect(form()).toBeNull();
    expect(record()).not.toBeNull();
    expect(fieldOf('Refund amount')?.value).toBe('120');
    expect(fieldOf('Refund amount')?.disabled).toBe(true);
    expect(fieldOf('Reply draft')?.value).toBe('Dear customer');
    expect(container.querySelectorAll('[data-decision-record] button')).toHaveLength(0);
  });

  it('shows a rejection with its reason and the values it turned down', () => {
    parkHumanOne();
    decideHumanOne({
      action: 'reject',
      effect: 'reject',
      edits: {},
      reason: 'Outside the policy',
      resolvedBy: 'human',
    });

    expect(fieldOf('Refund amount')?.value).toBe('80');
    expect(valueOf('Reason')).toBe('Outside the policy');
  });

  it('shows the settled values under the current picks, also when they change after the decision', () => {
    parkHumanOne();
    decideHumanOne({ action: 'approve', effect: 'resume', edits: {}, resolvedBy: 'human' });

    render(picks.filter((pick) => pick.label !== 'Reply draft'));

    expect(labelled('Reply draft')).toBeUndefined();
    expect(fieldOf('Refund amount')?.value).toBe('80');
  });
});

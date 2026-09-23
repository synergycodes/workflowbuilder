import { type ComponentProps, StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The editor's real form, so the decision form runs with the controls and validator the panel gives it.
import { registerCustomRenderers } from '../../../../../../packages/sdk/src/features/json-form/extension-registry';
import { JSONForm } from '../../../../../../packages/sdk/src/features/json-form/json-form';
import { workflowBuilderValidator } from '../../../../../../packages/sdk/src/utils/validation/workflow-builder-validator';
import { type SubmitDecisionResult, submitDecision } from '../../../adapters/submit-decision';
import { schema as nodeSchema } from '../../../nodes/human-decision/schema';
import { uischema as nodeUischema } from '../../../nodes/human-decision/uischema';
import { executionEvent as event } from '../../../stores/execution-event.fixture';
import {
  applyEvent,
  applySnapshot,
  resetExecution,
  setExecutionStarted,
  useExecutionStore,
} from '../../../stores/use-execution-store';
import { reviewRequest } from '../../../utils/human-decision/review-request.fixture';
import { decisionFormRenderer } from './decision-form-control';

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

vi.mock('../../../adapters/submit-decision', () => ({ submitDecision: vi.fn() }));
const submit = vi.mocked(submitDecision);

registerCustomRenderers([decisionFormRenderer]);

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const draftOutput = {
  refundAmount: 80,
  orderDate: '2026-09-01',
  replyDraft: 'Dear customer',
  itemCount: 3,
  internalReasoning: 'hidden',
};

const humanOneWait = { executionId: 'exec-1', nodeId: 'human-1', attempt: 1 };

function parkHumanOne(output: unknown = draftOutput) {
  act(() => {
    applyEvent(event({ type: 'node_completed', nodeId: 'draft-1', payload: { output } }));
    applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
  });
}

// A reconnected stream replays the run as a snapshot, so every output arrives as a new object.
function reconnect() {
  const { executionId, events } = useExecutionStore.getState();
  const replayed = structuredClone(events);
  act(() =>
    applySnapshot({ executionId: executionId!, status: 'waiting', lastSequence: replayed.length, events: replayed }),
  );
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

// JsonForms reports a change after a short debounce; the buttons and the node data follow that report.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function sentEdits() {
  return submit.mock.calls[0]?.[1]?.edits;
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('the decision form in the properties panel', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let nodeChanges: unknown[];
  let renderedRequests: unknown[];

  const render = (decisionRequest: unknown = reviewRequest, readonly = false) => {
    // JsonForms reports a change after its debounce even from an unmounted form, so each test keeps its own list.
    const changes = nodeChanges;
    renderedRequests.push(decisionRequest);
    act(() =>
      root.render(
        // The app runs in StrictMode, which mounts every effect twice; the drafts and the unmount report depend on it.
        <StrictMode>
          <JSONForm
            schema={nodeSchema}
            uischema={nodeUischema as ComponentProps<typeof JSONForm>['uischema']}
            data={{ label: 'Review Refund', description: '', decisionRequest }}
            readonly={readonly}
            onChange={({ data }) => changes.push(data)}
          />
        </StrictMode>,
      ),
    );
  };

  beforeEach(() => {
    resetExecution();
    selection.nodeId = 'human-1';
    nodeChanges = [];
    renderedRequests = [];
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
    // The form never writes the node: whatever node data the panel reports is a request the test rendered.
    for (const data of nodeChanges) {
      expect(renderedRequests).toContainEqual((data as { decisionRequest: unknown }).decisionRequest);
    }
  });

  const form = () => container.querySelector('[data-decision-form]');
  const record = () => container.querySelector('[data-decision-record]');
  // A row is found by its label, the way a person finds it.
  const labelled = (label: string) =>
    [...container.querySelectorAll('span')].find((span) => span.childElementCount === 0 && span.textContent === label)
      ?.parentElement?.parentElement ?? undefined;
  const fieldOf = (label: string) =>
    labelled(label)?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ?? undefined;
  const valueOf = (label: string) => labelled(label)?.querySelector('p')?.textContent ?? undefined;
  const hasError = (label: string) => labelled(label)!.querySelector('.base--error') !== null;
  const button = (label: string) =>
    [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === label)!;

  describe('what it shows', () => {
    it('renders nothing until the node waits, then the fields the request declares', () => {
      expect(form()).toBeNull();

      parkHumanOne();

      for (const label of ['Refund amount', 'orderDate', 'Reply draft', 'Expedite']) {
        expect(labelled(label), label).toBeDefined();
      }
      expect(labelled('Item count')).toBeUndefined();
      expect(labelled('tags')).toBeUndefined();
      expect(container.textContent).not.toContain('internalReasoning');
    });

    it('fills the fields from the proposal and disables the read-only one', () => {
      parkHumanOne();

      expect(fieldOf('Refund amount')?.value).toBe('80');
      expect(fieldOf('orderDate')?.value).toBe('2026-09-01');
      expect(fieldOf('orderDate')?.disabled).toBe(true);
      expect(fieldOf('Reply draft')?.value).toBe('Dear customer');
      expect(fieldOf('Reply draft')?.disabled).toBe(false);
    });

    it('renders nothing for a node whose properties carry no well-formed request', () => {
      parkHumanOne();
      render({ actions: 'approve' });

      expect(form()).toBeNull();
    });

    it('lets the person decide while the canvas is read-only, as it is for the whole run', async () => {
      render(reviewRequest, true);
      parkHumanOne();

      expect(fieldOf('Title')?.disabled).toBe(true);
      expect(fieldOf('Refund amount')?.disabled).toBe(false);

      commit(fieldOf('Refund amount')!, '120');
      await click(button('Approve'));

      expect(sentEdits()).toEqual({ refundAmount: 120 });
    });

    it('keeps the page and the reject when the request schema cannot be compiled', async () => {
      // Valid in JavaScript, but not under the `u` flag the SDK validator compiles patterns with.
      const schema = {
        type: 'object',
        properties: { note: { type: 'string', title: 'Note', pattern: String.raw`^ORD\-\d+$` } },
      };
      render({ ...reviewRequest, schema });
      parkHumanOne({ note: 'ORD-1' });

      expect(fieldOf('Title')).toBeDefined();
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('cannot be shown');
      expect(button('Approve').disabled).toBe(true);

      await click(button('Reject'));

      expect(submit).toHaveBeenCalledWith(humanOneWait, { action: 'reject', reason: '' });
    });

    it('takes the proposal from a declared source over the incoming edge', () => {
      render({ ...reviewRequest, proposalSourceNodeId: 'draft-2' });
      act(() =>
        applyEvent(event({ type: 'node_completed', nodeId: 'draft-2', payload: { output: { refundAmount: 15 } } })),
      );
      parkHumanOne();

      expect(fieldOf('Refund amount')?.value).toBe('15');
    });

    it('checks the fields with the validator the editor hands it, which runs without eval', () => {
      const compile = vi.spyOn(workflowBuilderValidator, 'compile');

      parkHumanOne();

      expect(compile).toHaveBeenCalledWith(reviewRequest.schema);
      compile.mockRestore();
    });

    it('leaves out a field JsonForms cannot address, and still edits one whose key it escapes', async () => {
      const properties = {
        'a/b': { type: 'string', title: 'Slash' },
        'a.b': { type: 'string', title: 'Dot' },
        'x~~y': { type: 'string', title: 'Tildes' },
        constructor: { type: 'string', title: 'Constructor' },
      };
      render({ ...reviewRequest, schema: { type: 'object', properties } });
      parkHumanOne({ 'a/b': 'one', 'a.b': 'two', 'x~~y': 'three', constructor: 'four' });

      expect(labelled('Dot')).toBeUndefined();
      expect(labelled('Tildes')).toBeUndefined();
      expect(labelled('Constructor')).toBeUndefined();
      expect(fieldOf('Slash')?.value).toBe('one');

      commit(fieldOf('Slash')!, 'changed');
      await click(button('Approve'));

      expect(sentEdits()).toEqual({ 'a/b': 'changed' });
    });

    it('shows and edits an optional field that structured output types with null', async () => {
      const schema = {
        type: 'object',
        properties: { note: { type: ['string', 'null'], title: 'Note' } },
        required: ['note'],
      };
      render({ ...reviewRequest, schema });
      parkHumanOne({ note: 'Call back' });

      expect(fieldOf('Note')?.value).toBe('Call back');

      commit(fieldOf('Note')!, 'Refunded');
      await click(button('Approve'));

      expect(sentEdits()).toEqual({ note: 'Refunded' });
    });

    it('does not hold back an optional field the model left null', async () => {
      const schema = {
        type: 'object',
        properties: { note: { type: ['string', 'null'], title: 'Note' } },
        required: ['note'],
      };
      render({ ...reviewRequest, schema });
      parkHumanOne({ note: null });
      await settle();

      expect(button('Approve').disabled).toBe(false);

      await click(button('Approve'));

      expect(sentEdits()).toEqual({});
    });

    it('still lets the person decide when the request declares no fields', async () => {
      parkHumanOne();
      render({ ...reviewRequest, schema: { type: 'object', properties: {} } });

      expect(button('Reject')).toBeDefined();

      await click(button('Approve'));

      expect(submit.mock.calls[0]?.[1]?.action).toBe('approve');
      expect(sentEdits()).toEqual({});
    });

    it('ends with the actions, the resume rightmost', () => {
      parkHumanOne();

      const buttons = [...form()!.querySelectorAll('button')].map((element) => element.textContent?.trim());

      expect(buttons).toEqual(['Reject', 'Approve']);
    });
  });

  describe('what the person types', () => {
    it('keeps what the person types to itself: the node data never changes', async () => {
      parkHumanOne();

      commit(fieldOf('Refund amount')!, '120');
      await settle();

      expect(fieldOf('Refund amount')?.value).toBe('120');
      expect(nodeChanges).not.toHaveLength(0);
      for (const data of nodeChanges) {
        expect((data as { decisionRequest: unknown }).decisionRequest).toEqual(reviewRequest);
      }
    });

    // In the panel a re-render comes from the selection hook when the node's other properties change.
    it('keeps what the person typed when the panel renders the control again', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');

      render({ ...reviewRequest });

      expect(fieldOf('Refund amount')?.value).toBe('120');
      await click(button('Approve'));
      expect(sentEdits()).toEqual({ refundAmount: 120 });
    });

    it('keeps what the person typed when the request arrives as a new but equal object', () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');

      render(structuredClone(reviewRequest));

      expect(fieldOf('Refund amount')?.value).toBe('120');
    });

    it('keeps what was typed while the panel shows another node, and measures the edits against the proposal', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');
      commit(fieldOf('Reason')!, 'Checked with the customer');

      selection.nodeId = 'draft-1';
      render();
      expect(form()).toBeNull();

      selection.nodeId = 'human-1';
      render();
      expect(fieldOf('Refund amount')?.value).toBe('120');
      expect(fieldOf('Reason')?.value).toBe('Checked with the customer');

      await click(button('Approve'));

      expect(sentEdits()).toEqual({ refundAmount: 120 });
    });

    it('sends no edit for a field it does not show when the stream reconnects, also after a visit elsewhere', async () => {
      parkHumanOne({ ...draftOutput, tags: ['vip'] });
      reconnect();

      selection.nodeId = 'draft-1';
      render();
      reconnect();
      selection.nodeId = 'human-1';
      render();
      await click(button('Approve'));

      expect(sentEdits()).toEqual({});
    });

    it('keeps a separate draft for each waiting node', () => {
      parkHumanOne();
      act(() => {
        applyEvent(event({ type: 'node_completed', nodeId: 'draft-2', payload: { output: { refundAmount: 15 } } }));
        applyEvent(event({ type: 'node_waiting', nodeId: 'human-2' }));
      });
      commit(fieldOf('Refund amount')!, '120');

      selection.nodeId = 'human-2';
      render();
      expect(fieldOf('Refund amount')?.value).toBe('15');
      commit(fieldOf('Refund amount')!, '20');

      selection.nodeId = 'human-1';
      render();
      expect(fieldOf('Refund amount')?.value).toBe('120');

      selection.nodeId = 'human-2';
      render();
      expect(fieldOf('Refund amount')?.value).toBe('20');
    });

    it('starts over on the second wait of the same node and answers that wait, not the first', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');

      act(() => {
        applyEvent(event({ type: 'node_completed', nodeId: 'human-1', payload: { output: { action: 'approve' } } }));
        applyEvent(
          event({
            type: 'node_completed',
            nodeId: 'draft-1',
            payload: { output: { ...draftOutput, refundAmount: 95 } },
          }),
        );
        applyEvent(event({ type: 'node_waiting', nodeId: 'human-1' }));
      });

      expect(fieldOf('Refund amount')?.value).toBe('95');

      await click(button('Approve'));

      expect(submit.mock.calls[0]?.[0]?.attempt).toBe(2);
      expect(sentEdits()).toEqual({});
    });

    it('starts a new run from the proposal, and the closing form of the old one leaves no draft in it', () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');

      act(() => setExecutionStarted('exec-2', 'http://backend/stream'));
      expect(form()).toBeNull();
      expect(useExecutionStore.getState().decisionDrafts).toEqual({});

      parkHumanOne();
      expect(fieldOf('Refund amount')?.value).toBe('80');
    });
  });

  describe('what blocks a decision', () => {
    it('refuses to send while the form fails its schema, even before the button greys out', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '');

      await click(button('Approve'));

      expect(submit).not.toHaveBeenCalled();
    });

    it('blocks the reject until a required reason is given', async () => {
      parkHumanOne();
      render({
        ...reviewRequest,
        actions: [reviewRequest.actions[0], { ...reviewRequest.actions[1], reasonRequired: true }],
      });

      expect(button('Reject').disabled).toBe(true);

      commit(fieldOf('Reason')!, '   ');
      expect(button('Reject').disabled).toBe(true);

      commit(fieldOf('Reason')!, 'Outside the policy');

      expect(button('Reject').disabled).toBe(false);
      await click(button('Reject'));
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it('marks and blocks while the form fails its schema, a required field emptied', async () => {
      parkHumanOne();

      commit(fieldOf('Refund amount')!, '');
      await settle();

      expect(hasError('Refund amount')).toBe(true);
      expect(button('Approve').disabled).toBe(true);
      expect(button('Reject').disabled).toBe(false);
    });

    it('blocks the approve from the start when the proposal leaves a required field out', async () => {
      parkHumanOne({ orderDate: '2026-09-01' });
      await settle();

      expect(button('Approve').disabled).toBe(true);

      commit(fieldOf('Refund amount')!, '49');
      await settle();

      expect(button('Approve').disabled).toBe(false);
    });

    it('does not block on a read-only field the proposal filled wrongly, which the person cannot correct', async () => {
      parkHumanOne({ ...draftOutput, orderDate: null });
      await settle();

      expect(button('Approve').disabled).toBe(false);

      await click(button('Approve'));

      expect(sentEdits()).toEqual({});
    });

    it.each([
      ['a field the form does not show', 'tags'],
      ['a read-only field', 'orderDate'],
    ])('does not block when the proposal leaves out %s that the schema requires', async (_name, required) => {
      const schema = { ...reviewRequest.schema, required: ['refundAmount', required] };
      render({ ...reviewRequest, schema });
      parkHumanOne(Object.fromEntries(Object.entries(draftOutput).filter(([key]) => key !== required)));
      await settle();

      expect(button('Approve').disabled).toBe(false);

      await click(button('Approve'));

      expect(sentEdits()).toEqual({});
    });
  });

  describe('sending a decision', () => {
    it('sends the decision for the wait the node is on, with no edits when nothing changed', async () => {
      parkHumanOne();

      await click(button('Approve'));

      expect(submit).toHaveBeenCalledWith(humanOneWait, { action: 'approve', edits: {} });
    });

    it('sends what was typed even when Approve is clicked before the form reports the change', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '130');

      await click(button('Approve'));

      expect(sentEdits()).toEqual({ refundAmount: 130 });
    });

    it('sends only the editable fields the person changed', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120.5');
      commit(fieldOf('Reply draft')!, 'Dear customer, refunded.');

      await click(button('Approve'));

      expect(sentEdits()).toEqual({ refundAmount: 120.5, replyDraft: 'Dear customer, refunded.' });
    });

    it('sends a switched boolean field', async () => {
      parkHumanOne();

      // The switch forwards a click to a hidden checkbox; jsdom does not run that forwarding, so the test clicks it.
      await click(labelled('Expedite')!.querySelector('input[type="checkbox"]')!);
      await click(button('Approve'));

      expect(sentEdits()).toEqual({ expedite: true });
    });

    it('sends a reject with its reason and without edits', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');
      commit(fieldOf('Reason')!, 'Outside the policy');

      await click(button('Reject'));

      expect(submit).toHaveBeenCalledWith(humanOneWait, { action: 'reject', reason: 'Outside the policy' });
    });

    it('locks the fields while the decision is on its way, so nothing typed then is lost', async () => {
      parkHumanOne();
      submit.mockReturnValue(new Promise(() => {}));

      await click(button('Approve'));

      expect(fieldOf('Refund amount')?.disabled).toBe(true);
      expect(fieldOf('Reply draft')?.disabled).toBe(true);
      expect(fieldOf('Reason')?.disabled).toBe(true);
      expect(button('Reject').disabled).toBe(true);
    });

    it('keeps a decision on its way when the person leaves and comes back, so a second one cannot be sent', async () => {
      parkHumanOne();
      submit.mockReturnValue(new Promise(() => {}));
      await click(button('Approve'));

      selection.nodeId = 'draft-1';
      render();
      selection.nodeId = 'human-1';
      render();

      expect(button('Approve').disabled).toBe(true);
      expect(button('Reject').disabled).toBe(true);
      expect(submit).toHaveBeenCalledTimes(1);
    });

    it('shows a refusal that arrived while the person was on another node', async () => {
      parkHumanOne();
      let answer!: (result: SubmitDecisionResult) => void;
      submit.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      await click(button('Approve'));

      selection.nodeId = 'draft-1';
      render();
      await act(async () =>
        answer({ ok: false, status: 409, code: 'decision_already_made', message: 'Someone decided' }),
      );
      selection.nodeId = 'human-1';
      render();

      expect(container.querySelector('[role="alert"]')?.textContent).toBe('Someone decided.');
      expect(button('Approve').disabled).toBe(false);
    });

    it('shows what the backend refused and keeps the values', async () => {
      parkHumanOne();
      commit(fieldOf('Refund amount')!, '120');
      submit.mockResolvedValue({
        ok: false,
        status: 409,
        code: 'decision_attempt_mismatch',
        message: 'The decision names a wait that is not the current one',
        currentAttempt: 2,
      });

      await click(button('Approve'));

      expect(container.querySelector('[role="alert"]')?.textContent).toContain('not the current one');
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('now 2');
      expect(fieldOf('Refund amount')?.value).toBe('120');
      expect(fieldOf('Refund amount')?.disabled).toBe(false);
      expect(button('Approve').disabled).toBe(false);
    });

    it('keeps the buttons down once a decision was accepted, and says so should the run be slow to show it', async () => {
      parkHumanOne();

      await click(button('Approve'));

      expect(button('Approve').disabled).toBe(true);
      expect(container.querySelector('[role="alert"]')).toBeNull();
      // Its style keeps the line hidden for its first second, so a healthy stack never shows it.
      expect(container.querySelector('[role="status"]')?.textContent).toBe(
        'Sent. Waiting for the run to record the decision.',
      );
    });
  });

  describe('after the decision', () => {
    it('shows the approved values read-only once the run moves on', () => {
      parkHumanOne();
      decideHumanOne({
        action: 'approve',
        effect: 'resume-with-edits',
        edits: { refundAmount: 120 },
        resolvedBy: 'human',
      });

      expect(form()).toBeNull();
      expect(record()).not.toBeNull();
      expect(fieldOf('Refund amount')?.value).toBe('120');
      expect(fieldOf('Refund amount')?.disabled).toBe(true);
      expect(fieldOf('Reply draft')?.value).toBe('Dear customer');
      expect(fieldOf('Reply draft')?.disabled).toBe(true);
      expect(labelled('Decision')).toBeUndefined();
      expect(container.querySelectorAll('button')).toHaveLength(0);
    });

    it('shows a rejection with its reason and the proposal it turned down', () => {
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

    it('does not check a settled decision again: a required field the proposal left out is not an error there', async () => {
      parkHumanOne({ orderDate: '2026-09-01' });
      decideHumanOne({ action: 'reject', effect: 'reject', edits: {}, reason: 'No amount', resolvedBy: 'human' });
      await settle();

      expect(fieldOf('Refund amount')?.value).toBe('');
      expect(hasError('Refund amount')).toBe(false);
    });

    it('keeps showing the decision after the run has ended', () => {
      parkHumanOne();
      decideHumanOne({ action: 'approve', effect: 'resume', edits: {}, resolvedBy: 'human' });
      act(() => applyEvent(event({ type: 'execution_completed', payload: undefined })));

      expect(record()).not.toBeNull();
      expect(fieldOf('Refund amount')?.value).toBe('80');
    });

    it('shows nothing when the run is cancelled while parked, because nothing was decided', () => {
      parkHumanOne();
      act(() => applyEvent(event({ type: 'execution_cancelled', payload: {} })));

      expect(form()).toBeNull();
      expect(record()).toBeNull();
    });
  });
});

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The texts a person reads, through the backend's own module, as submit-decision.test.ts reads its schema.
import { DECISION_REFUSALS } from '../../../backend/src/routes/decision-refusals';
import { type SubmitDecisionResult, submitDecision } from '../adapters/submit-decision';
import { resetExecution, setExecutionStarted } from '../stores/use-execution-store';
import { useDecisionSubmit } from './use-decision-submit';

vi.mock('../adapters/submit-decision', () => ({ submitDecision: vi.fn() }));
const decide = vi.mocked(submitDecision);

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const wait = { executionId: 'exec-1', nodeId: 'human-1', attempt: 1 };
let unmount: (() => void) | undefined;

function renderSubmit() {
  let latest: ReturnType<typeof useDecisionSubmit> | undefined;
  function Probe() {
    latest = useDecisionSubmit(wait);
    return null;
  }
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Probe />));
  unmount = () => act(() => root.unmount());
  return () => latest!;
}

async function send(state: () => ReturnType<typeof useDecisionSubmit>) {
  await act(async () => {
    await state().submit({ action: 'approve' });
  });
}

const refusal = (result: Partial<Extract<SubmitDecisionResult, { ok: false }>>): SubmitDecisionResult => ({
  ok: false,
  status: 409,
  code: 'decision_already_made',
  message: 'Refused',
  ...result,
});

describe('useDecisionSubmit', () => {
  beforeEach(() => {
    decide.mockReset();
    resetExecution();
    setExecutionStarted('exec-1', '/api/executions/exec-1/stream');
  });

  afterEach(() => unmount?.());

  it('sends the decision for its wait and stays busy once it is accepted, with nothing to say', async () => {
    decide.mockResolvedValue({ ok: true });
    const state = renderSubmit();

    await send(state);

    expect(decide).toHaveBeenCalledWith(wait, { action: 'approve' });
    expect(state().isBusy).toBe(true);
    expect(state().isAccepted).toBe(true);
    expect(state().message).toBeUndefined();
  });

  it('frees the form after a refusal and names the wait it now has to answer', async () => {
    decide.mockResolvedValue(
      refusal({
        code: 'decision_attempt_mismatch',
        message: DECISION_REFUSALS.attempt_mismatch.message,
        currentAttempt: 2,
      }),
    );
    const state = renderSubmit();

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe('The decision names a wait that is not the current one. The wait to answer is now 2.');
  });

  it('tells when to try again after a delivery timeout', async () => {
    decide.mockResolvedValue(
      refusal({ status: 503, message: DECISION_REFUSALS.delivery_timeout.message, retryAfterSeconds: 5 }),
    );
    const state = renderSubmit();

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe(`${DECISION_REFUSALS.delivery_timeout.message} Try again in 5 s.`);
  });

  it('adds the first detail of a validation refusal', async () => {
    decide.mockResolvedValue(
      refusal({
        status: 400,
        message: DECISION_REFUSALS.decision_invalid.message,
        detail: "action 'reject' requires a reason",
      }),
    );
    const state = renderSubmit();

    await send(state);

    expect(state().message).toBe("Decision failed validation. action 'reject' requires a reason.");
  });

  it('frees the form when the adapter throws, which it is written not to do', async () => {
    decide.mockRejectedValue(new Error('boom'));
    const state = renderSubmit();

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe('boom');
  });

  it('clears the previous message when it sends again', async () => {
    decide.mockResolvedValueOnce(refusal({ message: 'First.' })).mockReturnValueOnce(new Promise(() => {}));
    const state = renderSubmit();
    await send(state);

    act(() => {
      void state().submit({ action: 'approve' });
    });

    expect(state().message).toBeUndefined();
    expect(state().isBusy).toBe(true);
  });

  it('keeps an answer that arrives after the form is gone, for when the person comes back', async () => {
    let answer!: (result: SubmitDecisionResult) => void;
    decide.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const first = renderSubmit();
    act(() => {
      void first().submit({ action: 'approve' });
    });
    unmount?.();

    await act(async () => answer(refusal({ message: 'Someone decided first' })));
    const again = renderSubmit();

    expect(again().message).toBe('Someone decided first.');
    expect(again().isBusy).toBe(false);
  });
});

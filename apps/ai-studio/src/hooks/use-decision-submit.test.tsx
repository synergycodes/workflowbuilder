import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SubmitDecisionResult } from '../adapters/submit-decision';
import { useDecisionSubmit } from './use-decision-submit';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let unmount: (() => void) | undefined;

function renderSubmit(decide: () => Promise<SubmitDecisionResult>) {
  let latest: ReturnType<typeof useDecisionSubmit> | undefined;
  function Probe() {
    latest = useDecisionSubmit(decide);
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
  afterEach(() => unmount?.());

  it('stays busy after an accepted decision, with nothing to say', async () => {
    const state = renderSubmit(vi.fn().mockResolvedValue({ ok: true, effect: 'resume' }));

    await send(state);

    expect(state().isBusy).toBe(true);
    expect(state().message).toBeUndefined();
  });

  it('frees the form after a refusal and names the wait it now has to answer', async () => {
    const state = renderSubmit(
      vi
        .fn()
        .mockResolvedValue(
          refusal({ code: 'decision_attempt_mismatch', message: 'Not this wait.', currentAttempt: 2 }),
        ),
    );

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe('Not this wait. The wait to answer is now 2.');
  });

  it('tells when to try again after a delivery timeout', async () => {
    const state = renderSubmit(
      vi.fn().mockResolvedValue(refusal({ status: 503, message: 'Send it again.', retryAfterSeconds: 5 })),
    );

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe('Send it again. Try again in 5 s.');
  });

  it('adds the first detail of a validation refusal', async () => {
    const state = renderSubmit(
      vi
        .fn()
        .mockResolvedValue(refusal({ status: 400, message: 'Decision failed validation.', detail: 'reason required' })),
    );

    await send(state);

    expect(state().message).toBe('Decision failed validation. reason required');
  });

  it('frees the form when the adapter throws, which it is written not to do', async () => {
    const state = renderSubmit(vi.fn().mockRejectedValue(new Error('boom')));

    await send(state);

    expect(state().isBusy).toBe(false);
    expect(state().message).toBe('boom');
  });

  it('clears the previous message when it sends again', async () => {
    const decide = vi
      .fn()
      .mockResolvedValueOnce(refusal({ message: 'First.' }))
      .mockReturnValueOnce(new Promise(() => {}));
    const state = renderSubmit(decide);
    await send(state);

    act(() => {
      void state().submit({ action: 'approve' });
    });

    expect(state().message).toBeUndefined();
    expect(state().isBusy).toBe(true);
  });
});

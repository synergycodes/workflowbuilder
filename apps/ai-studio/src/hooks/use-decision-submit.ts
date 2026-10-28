import { type DecisionInput, type SubmitDecisionResult, submitDecision } from '../adapters/submit-decision';
import { type DecisionWait, saveDecisionSend, useExecutionStore, waitKey } from '../stores/use-execution-store';

function refusalMessage(result: Extract<SubmitDecisionResult, { ok: false }>): string {
  return [
    result.message,
    result.detail,
    result.currentAttempt === undefined ? undefined : `The wait to answer is now ${result.currentAttempt}.`,
    result.retryAfterSeconds === undefined ? undefined : `Try again in ${result.retryAfterSeconds} s.`,
  ]
    .filter((part) => part !== undefined)
    .map((part) => (part.endsWith('.') ? part : `${part}.`))
    .join(' ');
}

function holdsTheForm(send: { status: string } | undefined): boolean {
  return send?.status === 'sending' || send?.status === 'accepted';
}

/**
 * Sends the decision for a wait and keeps where it stands in the store, so a person who leaves the node and comes back
 * finds it still on its way, accepted or refused. An accepted decision keeps the form busy until the run records it and
 * the panel shows the decision instead; a refusal frees the form and says why.
 */
export function useDecisionSubmit(wait: DecisionWait) {
  const send = useExecutionStore((state) => state.decisionSends[waitKey(wait)]);

  const submit = async (input: DecisionInput) => {
    // Read from the store, not the render: a second press in the same frame would be refused and hide the acceptance.
    if (holdsTheForm(useExecutionStore.getState().decisionSends[waitKey(wait)])) {
      return;
    }
    saveDecisionSend(wait, { status: 'sending' });

    let result: SubmitDecisionResult;
    try {
      result = await submitDecision(wait, input);
    } catch (error) {
      // The adapter answers with a result instead of throwing; a throw would be its bug, not a dead form.
      const message = error instanceof Error ? error.message : 'The decision could not be sent.';
      saveDecisionSend(wait, { status: 'refused', message });
      return;
    }

    saveDecisionSend(wait, result.ok ? { status: 'accepted' } : { status: 'refused', message: refusalMessage(result) });
  };

  return {
    isBusy: holdsTheForm(send),
    isAccepted: send?.status === 'accepted',
    message: send?.status === 'refused' ? send.message : undefined,
    submit,
  };
}

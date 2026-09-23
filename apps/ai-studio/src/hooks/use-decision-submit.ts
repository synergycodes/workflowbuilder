import { useState } from 'react';

import type { DecisionInput, SubmitDecisionResult } from '../adapters/submit-decision';

function refusalMessage(result: Extract<SubmitDecisionResult, { ok: false }>): string {
  return [
    result.message,
    result.detail,
    result.currentAttempt === undefined ? undefined : `The wait to answer is now ${result.currentAttempt}.`,
    result.retryAfterSeconds === undefined ? undefined : `Try again in ${result.retryAfterSeconds} s.`,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
}

/**
 * Sends a decision and turns the answer into what the form shows. An accepted decision is final, so the form stays
 * busy until the run moves the node on and the panel shows the decision instead; a refusal leaves it usable and says why.
 */
export function useDecisionSubmit(decide: (input: DecisionInput) => Promise<SubmitDecisionResult>) {
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const submit = async (input: DecisionInput) => {
    setIsBusy(true);
    setMessage(undefined);

    let result: SubmitDecisionResult;
    try {
      result = await decide(input);
    } catch (error) {
      // The adapter answers with a result instead of throwing; a throw would be its bug, not a dead form.
      setMessage(error instanceof Error ? error.message : 'The decision could not be sent.');
      setIsBusy(false);
      return;
    }

    if (result.ok) {
      return;
    }

    setMessage(refusalMessage(result));
    setIsBusy(false);
  };

  return { isBusy, message, submit };
}

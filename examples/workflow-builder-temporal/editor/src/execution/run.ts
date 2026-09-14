import { getStoreDataForIntegration } from '@workflowbuilder/sdk';

import { drawAmount } from '../../../src/amount';
import type { RunEvent, RunRequest, RunResponse } from '../../../src/protocol';
import { applyRunEvent, isRunOver, runErrored, runStarted, runStarting, useRunStore } from './run-store';

let stream: EventSource | undefined;

export async function runFromCanvas(): Promise<void> {
  stream?.close();
  runStarting();

  // The decision node routes on this. Left to chance, about half the runs take each branch.
  const amount = drawAmount();

  const { nodes, edges } = getStoreDataForIntegration();
  const request: RunRequest = { nodes, edges, triggerPayload: { amount, customer: 'Ada' } };

  let response: Response;
  try {
    response = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    runErrored('Could not reach the bridge. Is `npm start` running in the sample folder?');
    return;
  }

  if (!response.ok) {
    const { message } = (await response.json().catch(() => ({}))) as { message?: string };
    runErrored(message ?? `The bridge answered ${response.status}. Is \`npm start\` running?`);
    return;
  }

  const { executionId, temporalUiUrl } = (await response.json()) as RunResponse;
  runStarted(executionId, temporalUiUrl, amount);

  stream = new EventSource(`/api/runs/${executionId}/events`);
  stream.addEventListener('message', (message) => {
    applyRunEvent(JSON.parse(String(message.data)) as RunEvent);
    if (isRunOver(useRunStore.getState().phase)) stream?.close();
  });
  stream.addEventListener('error', () => {
    if (isRunOver(useRunStore.getState().phase)) return;
    runErrored('Lost the event stream. Is the worker still running?');
    stream?.close();
  });
}

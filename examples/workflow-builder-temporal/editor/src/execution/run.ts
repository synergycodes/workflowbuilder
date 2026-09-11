import { getStoreDataForIntegration } from '@workflowbuilder/sdk';

import type { RunEvent, RunRequest, RunResponse } from '../../../src/protocol';
import { applyRunEvent, isRunOver, runErrored, runStarted, runStarting, useRunStore } from './run-store';

// What the trigger node hands downstream. Change `amount` to 50 and the condition node
// reports `matched: false`.
const TRIGGER_PAYLOAD = { amount: 250, customer: 'Ada' };

let stream: EventSource | undefined;

export async function runFromCanvas(): Promise<void> {
  stream?.close();
  runStarting();

  const { nodes, edges } = getStoreDataForIntegration();
  const request: RunRequest = { nodes, edges, triggerPayload: TRIGGER_PAYLOAD };

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
  runStarted(executionId, temporalUiUrl);

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

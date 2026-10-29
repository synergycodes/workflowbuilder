import { getStoreDataForIntegration } from '@workflowbuilder/sdk';

import type { RunEvent, RunRequest, RunResponse } from '../../../shared/protocol';
import { drawTriggerPayload } from '../../../shared/trigger-payload';
import { applyRunEvent, isRunOver, runErrored, runStarted, runStarting, useRunStore } from './run-store';

let stream: EventSource | undefined;

// The Run button does not await this, so anything thrown has to end the run here, or the
// header buttons stay disabled until a reload.
export async function runFromCanvas(): Promise<void> {
  try {
    await startRun();
  } catch (error) {
    runErrored(`Could not start the run: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function startRun(): Promise<void> {
  stream?.close();
  runStarting();

  const { nodes, edges } = getStoreDataForIntegration();
  const request: RunRequest = { nodes, edges, triggerPayload: drawTriggerPayload() };

  let response: Response;
  try {
    response = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    runErrored('Could not reach the bridge. Is `npm start` running in `worker/`?');
    return;
  }

  if (!response.ok) {
    const { message } = (await response.json().catch(() => ({}))) as { message?: string };
    runErrored(message ?? `The bridge answered ${response.status}. Is \`npm start\` running?`);
    return;
  }

  const { executionId, temporalUiUrl } = (await response.json()) as RunResponse;
  runStarted(temporalUiUrl);

  const source = new EventSource(`/api/runs/${executionId}/events`);
  stream = source;
  source.addEventListener('message', (message) => {
    applyRunEvent(JSON.parse(String(message.data)) as RunEvent);
    if (isRunOver(useRunStore.getState().phase)) source.close();
  });
  // While the browser reconnects (CONNECTING), the bridge replays the run's history, so only a
  // stream the browser gave up on (CLOSED) is lost.
  source.addEventListener('error', () => {
    if (isRunOver(useRunStore.getState().phase) || source.readyState !== EventSource.CLOSED) return;
    runErrored('Lost the event stream. Is the worker still running?');
  });
}

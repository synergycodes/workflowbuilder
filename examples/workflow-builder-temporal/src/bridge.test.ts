import type { WorkflowExecutionInput } from '@workflowbuilder/temporal';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { type RunSubmitter, startBridge } from './bridge';
import type { SampleNode } from './nodes';
import type { RunEvent, RunResponse } from './protocol';
import { createRunStore } from './store';

const submitted: WorkflowExecutionInput<SampleNode>[] = [];
const engine: RunSubmitter = {
  async submit(input) {
    submitted.push(input);
  },
};
const store = createRunStore({ log: () => {} });

let server: ReturnType<typeof startBridge>;
let baseUrl = '';

before(async () => {
  server = startBridge({ engine, store, port: 0 });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

const snapshot = {
  nodes: [{ id: 'trigger-1', data: { type: 'trigger', properties: { label: 'New request' } } }],
  edges: [],
};

function post(body: unknown) {
  return fetch(`${baseUrl}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/runs maps the snapshot, submits it, and answers with the run id and UI link', async () => {
  const response = await post({ ...snapshot, triggerPayload: { amount: 1 } });
  assert.equal(response.status, 201);

  const body = (await response.json()) as RunResponse;
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].executionId, body.executionId);
  assert.equal(submitted[0].definition.nodes[0].role, 'start');
  assert.deepEqual(submitted[0].triggerPayload, { amount: 1 });
  assert.match(body.temporalUiUrl, new RegExp(`/workflows/execution-${body.executionId}$`));
});

test('POST /api/runs answers 400 with the mapper message for a diagram it cannot run', async () => {
  const response = await post({ nodes: [{ id: 'x', data: { type: 'mystery' } }], edges: [] });
  assert.equal(response.status, 400);
  assert.match(((await response.json()) as { message: string }).message, /Unknown node type "mystery"/);
});

test('POST /api/runs answers 400 when the body is not a snapshot', async () => {
  const response = await post({ hello: 'world' });
  assert.equal(response.status, 400);
  assert.match(((await response.json()) as { message: string }).message, /nodes/);
});

test('unknown routes answer 404', async () => {
  const response = await fetch(`${baseUrl}/api/nothing`);
  assert.equal(response.status, 404);
});

test('GET /api/runs/:id/events replays history, then streams live events', async () => {
  await store.emitExecutionEvent('run-1', 1, 'execution_started');

  const response = await fetch(`${baseUrl}/api/runs/run-1/events`);
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffered = '';
  const nextEvent = async (): Promise<RunEvent> => {
    while (!buffered.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) throw new Error('stream ended');
      buffered += decoder.decode(value, { stream: true });
    }
    const [frame, ...rest] = buffered.split('\n\n');
    buffered = rest.join('\n\n');
    return JSON.parse(frame.replace(/^data: /, '')) as RunEvent;
  };

  assert.deepEqual(await nextEvent(), { kind: 'event', sequence: 1, type: 'execution_started' });

  await store.updateExecutionStatus('run-1', 'completed');
  assert.deepEqual(await nextEvent(), { kind: 'status', status: 'completed' });

  await reader.cancel();
});

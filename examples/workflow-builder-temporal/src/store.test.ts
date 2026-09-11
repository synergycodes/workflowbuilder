import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { RunEvent } from './protocol';
import { createRunStore } from './store';

const silent = { log: () => {} };

test('records events and status changes in order and hands them to subscribers', async () => {
  const store = createRunStore(silent);
  const seen: RunEvent[] = [];
  const unsubscribe = store.subscribe('run-1', (event) => seen.push(event));

  await store.emitExecutionEvent('run-1', 1, 'execution_started');
  await store.emitExecutionEvent('run-1', 2, 'node_started', undefined, 'trigger-1');
  await store.updateExecutionStatus('run-1', 'running');
  unsubscribe();
  await store.updateExecutionStatus('run-1', 'completed');

  assert.equal(seen.length, 3);
  assert.deepEqual(store.history('run-1'), [
    { kind: 'event', sequence: 1, type: 'execution_started', nodeId: undefined, payload: undefined },
    { kind: 'event', sequence: 2, type: 'node_started', nodeId: 'trigger-1', payload: undefined },
    { kind: 'status', status: 'running', errorMessage: undefined },
    { kind: 'status', status: 'completed', errorMessage: undefined },
  ]);
});

test('ignores a redelivered event whose sequence it already holds', async () => {
  const store = createRunStore(silent);
  await store.emitExecutionEvent('run-1', 1, 'execution_started');
  await store.emitExecutionEvent('run-1', 1, 'execution_started');
  assert.equal(store.history('run-1').length, 1);
});

test('keeps runs apart', async () => {
  const store = createRunStore(silent);
  await store.emitExecutionEvent('run-1', 1, 'execution_started');
  await store.emitExecutionEvent('run-2', 1, 'execution_started');
  assert.equal(store.history('run-1').length, 1);
  assert.equal(store.history('run-3').length, 0);
});

test('prints one line per event with the payload when there is one', async () => {
  const lines: string[] = [];
  const store = createRunStore({ log: (line) => lines.push(line) });
  await store.emitExecutionEvent('abcdef12-0000', 3, 'node_completed', { output: { ok: true } }, 'action-1');
  await store.updateExecutionStatus('abcdef12-0000', 'failed', 'boom');
  assert.deepEqual(lines, [
    '[abcdef12] # 3 node_completed (action-1) {"output":{"ok":true}}',
    '[abcdef12] status failed: boom',
  ]);
});

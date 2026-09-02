import { describe, expect, it, vi } from 'vitest';

import { type ExecutionContext, type ExecutionStore, WorkflowBuilderPlugin, createActivities } from '../src/index';
import type { BaseNode } from '../src/index';

type TestNode = (BaseNode & { type: 'test/echo' }) | (BaseNode & { type: 'test/upper' });

function makeStore(): ExecutionStore & {
  events: unknown[][];
  statuses: unknown[][];
} {
  const events: unknown[][] = [];
  const statuses: unknown[][] = [];
  return {
    events,
    statuses,
    async emitExecutionEvent(...received) {
      events.push(received);
    },
    async updateExecutionStatus(...received) {
      statuses.push(received);
    },
  };
}

const context: ExecutionContext = {
  workflowId: 'wf-1',
  executionId: 'exec-1',
  triggerPayload: {},
  nodeOutputs: {},
  variables: {},
  global: {},
};

describe('createActivities', () => {
  it('routes each node to the executor registered for its type', async () => {
    const store = makeStore();
    const activities = createActivities<TestNode>({
      store,
      executors: {
        'test/echo': (node) => ({ output: `echo-${node.id}` }),
        'test/upper': (node) => ({ output: node.id.toUpperCase() }),
      },
    });

    await expect(activities.executeNode({ id: 'a', type: 'test/echo', config: {} }, context)).resolves.toEqual({
      output: 'echo-a',
    });
    await expect(activities.executeNode({ id: 'b', type: 'test/upper', config: {} }, context)).resolves.toEqual({
      output: 'B',
    });
  });

  it('fails loudly for a node type with no executor', async () => {
    const activities = createActivities({
      store: makeStore(),
      executors: {} as never,
    });

    await expect(activities.executeNode({ id: 'a', type: 'test/missing', config: {} }, context)).rejects.toThrow(
      'No executor registered for node type: test/missing',
    );
  });

  it('hands the event through to the store with its sequence intact', async () => {
    const store = makeStore();
    const activities = createActivities<TestNode>({
      store,
      executors: { 'test/echo': () => ({ output: null }), 'test/upper': () => ({ output: null }) },
    });

    await activities.emitEvent('exec-1', 7, 'node_completed', { output: 'x' }, 'node-a');

    expect(store.events).toEqual([['exec-1', 7, 'node_completed', { output: 'x' }, 'node-a']]);
  });

  it('forwards a status update together with its error message', async () => {
    const store = makeStore();
    const activities = createActivities<TestNode>({
      store,
      executors: { 'test/echo': () => ({ output: null }), 'test/upper': () => ({ output: null }) },
    });

    await activities.updateStatus('exec-1', 'failed', 'boom');

    expect(store.statuses).toEqual([['exec-1', 'failed', 'boom']]);
  });
});

function makePlugin(taskQueue?: string) {
  return new WorkflowBuilderPlugin<TestNode>({
    store: makeStore(),
    executors: { 'test/echo': () => ({ output: null }), 'test/upper': () => ({ output: null }) },
    taskQueue,
  });
}

describe('WorkflowBuilderPlugin', () => {
  it('adds its three activities without displacing the consumer’s own', () => {
    const consumerActivity = vi.fn();
    const configured = makePlugin().configureWorker({
      taskQueue: 'consumer-queue',
      activities: { consumerActivity },
    });

    expect(Object.keys(configured.activities ?? {}).sort()).toEqual([
      'consumerActivity',
      'emitEvent',
      'executeNode',
      'updateStatus',
    ]);
  });

  it('leaves the rest of the worker configuration alone', () => {
    // The consumer owns the connection, the queue and the workflow bundle. A plugin
    // that quietly rewrote any of them would be very hard to debug.
    const configured = makePlugin().configureWorker({
      taskQueue: 'consumer-queue',
      workflowsPath: '/somewhere/workflows.ts',
    });

    expect(configured.taskQueue).toBe('consumer-queue');
    expect(configured.workflowsPath).toBe('/somewhere/workflows.ts');
  });

  it('registers under the name Temporal expects to see in logs', () => {
    // Reviewed by Temporal and surfaced in users' worker logs, so it changes
    // deliberately. See the note next to PLUGIN_NAME for why it is dotted.
    expect(makePlugin().name).toBe('workflowbuilder.WorkflowBuilderPlugin');
  });

  it('defaults the task queue to the shared constant and takes an override', () => {
    expect(makePlugin().taskQueue).toBe('workflow-execution');
    expect(makePlugin('other-queue').taskQueue).toBe('other-queue');
  });
});

function withProfiles(nodeActivityProfiles: unknown) {
  return () =>
    new WorkflowBuilderPlugin<TestNode>({
      store: makeStore(),
      executors: { 'test/echo': () => ({ output: null }), 'test/upper': () => ({ output: null }) },
      nodeActivityProfiles: nodeActivityProfiles as never,
    });
}

describe('WorkflowBuilderPlugin node activity profiles', () => {
  it('fails Worker.create rather than the first workflow activation', () => {
    // The same check inside the workflow runs on first activation, too late for a deploy.
    expect(withProfiles({ 'test/echo': { startToCloseTimeout: '30 minutes', retry: { maximumAttempts: 2 } } })).toThrow(
      /nodeActivityProfiles\["test\/echo"\]\.startToCloseTimeout/,
    );
    expect(withProfiles({ 'test/echo': { startToCloseTimeout: '0s', retry: { maximumAttempts: 2 } } })).toThrow(
      TypeError,
    );
  });

  it('accepts a well-formed map, and stays optional', () => {
    expect(withProfiles({ 'test/echo': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } })).not.toThrow();
    expect(() => makePlugin()).not.toThrow();
  });

  it('warns about a profile with no executor, which is the one thing the sandbox cannot see', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withProfiles({ 'test/typo': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } })();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toMatch(/"test\/typo"/);
    warn.mockRestore();
  });

  it('stays quiet when every profile matches a registered executor', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    withProfiles({ 'test/echo': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } })();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

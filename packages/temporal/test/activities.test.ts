import { ApplicationFailure } from '@temporalio/activity';
import { describe, expect, it, vi } from 'vitest';

import { mapExecutorError } from '../src/activities';
import type { BaseNode, LogBindings, LoggerPort, WorkflowBuilderPluginOptions } from '../src/index';
import {
  type ExecutionContext,
  type ExecutionStore,
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
  WorkflowBuilderPlugin,
  createActivities,
} from '../src/index';

type TestNode = (BaseNode & { type: 'test/echo' }) | (BaseNode & { type: 'test/upper' });

function makeLogger(): LoggerPort & { warnings: { message: string; bindings?: LogBindings }[] } {
  const warnings: { message: string; bindings?: LogBindings }[] = [];
  const logger: LoggerPort = {
    debug: () => {},
    info: () => {},
    warn: (message, bindings) => warnings.push({ message, bindings }),
    error: () => {},
    child: () => logger,
  };
  return { ...logger, warnings };
}

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

function activitiesThrowing(error: unknown) {
  return createActivities<TestNode>({
    store: makeStore(),
    executors: {
      'test/echo': () => {
        throw error;
      },
      'test/upper': () => ({ output: null }),
    },
  });
}

const failing = { id: 'a', type: 'test/echo', config: {} } as const;

describe('executeNode — error classification', () => {
  it.each([
    ['a plain Error', new Error('boom')],
    ['an unclassified NodeExecutionError', new NodeExecutionError('no_branch_matched', 'No branch')],
  ])('rethrows %s as the very same object', async (_label, thrown) => {
    // The byte-identity guarantee: an executor that never opted in must reach
    // the SDK's own conversion untouched, exactly as it did before.
    await expect(activitiesThrowing(thrown).executeNode(failing, context)).rejects.toBe(thrown);
  });

  it('maps a permanent error to a non-retryable failure carrying code and attempt', async () => {
    const thrown = new PermanentNodeExecutionError('bad_api_key', 'Provider rejected the API key');

    const failure = await activitiesThrowing(thrown)
      .executeNode(failing, context)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApplicationFailure);
    expect(failure).toMatchObject({
      message: 'Provider rejected the API key',
      type: 'PermanentNodeExecutionError',
      nonRetryable: true,
      // No activity context in a direct call, so the attempt falls back to 1.
      details: [{ wbNodeError: 1, classification: 'permanent', code: 'bad_api_key', attempt: 1 }],
      cause: thrown,
    });
  });

  it('maps a transient error to a retryable failure', async () => {
    const thrown = new TransientNodeExecutionError('rate_limited', 'Slow down');

    const failure = await activitiesThrowing(thrown)
      .executeNode(failing, context)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApplicationFailure);
    expect(failure).toMatchObject({
      type: 'TransientNodeExecutionError',
      nonRetryable: false,
      details: [{ classification: 'transient', code: 'rate_limited' }],
    });
  });

  it('catches a rejected promise, not only a synchronous throw', async () => {
    const activities = createActivities<TestNode>({
      store: makeStore(),
      executors: {
        'test/echo': () => Promise.reject(new PermanentNodeExecutionError('bad_api_key', 'Rejected')),
        'test/upper': () => ({ output: null }),
      },
    });

    await expect(activities.executeNode(failing, context)).rejects.toBeInstanceOf(ApplicationFailure);
  });
});

describe('mapExecutorError', () => {
  it('reports the attempt it was given', () => {
    const failure = mapExecutorError(new TransientNodeExecutionError('llm_timeout', 'Timed out'), 2);

    expect(failure).toMatchObject({ details: [{ attempt: 2, classification: 'transient' }] });
  });

  it('classifies an error from another copy of the class by its shape', () => {
    // Executors throw the core's own classes; this module sees a bundled copy,
    // so the two class objects are never the same and `instanceof` cannot be
    // what decides this.
    const foreign = Object.assign(new Error('Provider rejected the API key'), {
      name: 'PermanentNodeExecutionError',
      code: 'bad_api_key',
      classification: 'permanent',
    });

    expect(mapExecutorError(foreign, 1)).toMatchObject({
      nonRetryable: true,
      details: [{ code: 'bad_api_key', classification: 'permanent' }],
    });
  });

  it('passes a non-Error through untouched', () => {
    expect(mapExecutorError('just a string', 1)).toBe('just a string');
  });
});

function makePlugin(overrides: Partial<WorkflowBuilderPluginOptions<TestNode>> = {}) {
  return new WorkflowBuilderPlugin<TestNode>({
    store: makeStore(),
    executors: { 'test/echo': () => ({ output: null }), 'test/upper': () => ({ output: null }) },
    ...overrides,
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
    expect(makePlugin({ taskQueue: 'other-queue' }).taskQueue).toBe('other-queue');
  });
});

function withProfiles(nodeActivityProfiles: unknown, logger?: LoggerPort) {
  return () => makePlugin({ nodeActivityProfiles: nodeActivityProfiles as never, logger });
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

  it('routes the warning through a supplied logger, leaving console alone', () => {
    // A worker with a structured sink is not watching the console stream.
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = makeLogger();

    withProfiles({ 'test/typo': { startToCloseTimeout: '90s', retry: { maximumAttempts: 3 } } }, logger)();

    expect(consoleWarn).not.toHaveBeenCalled();
    expect(logger.warnings).toHaveLength(1);
    expect(logger.warnings[0]?.message).toMatch(/"test\/typo"/);
    expect(logger.warnings[0]?.bindings).toMatchObject({ nodeTypes: ['test/typo'] });
    consoleWarn.mockRestore();
  });
});

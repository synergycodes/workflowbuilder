// The client side of the durable pause: a verdict travels through the engine port, and
// every refusal comes back as a result rather than a throw.
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TemporalWorkflowEngine, type TemporalWorkflowEngineOptions } from '../src/client/index';
import {
  type ResolveNodeResult,
  WorkflowBuilderPlugin,
  type WorkflowDefinition,
  executionWorkflowId,
} from '../src/index';
import { type RecordingStore, createRecordingStore } from './fixtures/graph';
import { waitUntil } from './fixtures/helpers';
import {
  type PauseHarness,
  type PauseTestNode,
  SINGLE_GATE_GRAPH,
  TWO_GATES_GRAPH,
  createPauseExecutors,
} from './fixtures/pause-graph';

function whenAnnounced(store: RecordingStore, nodeId: string): Promise<void> {
  return waitUntil(
    () => store.events.some((event) => event.nodeId === nodeId && event.type === 'node_waiting'),
    `node_waiting for ${nodeId}`,
  );
}

describe('resolveNode through the engine port', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };

  beforeAll(async () => {
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({ workflowsPath: fileURLToPath(new URL('fixtures/workflows.ts', import.meta.url)) }),
      TestWorkflowEnvironment.createLocal(),
    ]);
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  function createWorker(taskQueue: string, store: RecordingStore, harness: PauseHarness): Promise<Worker> {
    const plugin = new WorkflowBuilderPlugin<PauseTestNode>({ store, executors: harness.executors, taskQueue });
    return Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
    });
  }

  function createEngine(taskQueue: string, options: Partial<TemporalWorkflowEngineOptions> = {}) {
    return new TemporalWorkflowEngine<PauseTestNode>({ client: env.client, taskQueue, ...options });
  }

  async function submit(
    engine: TemporalWorkflowEngine<PauseTestNode>,
    executionId: string,
    definition: WorkflowDefinition<PauseTestNode>,
  ) {
    await engine.submit({
      workflowId: definition.workflowId,
      executionId,
      definition,
      triggerPayload: {},
      variables: {},
      global: {},
    });
    return env.client.workflow.getHandle(executionWorkflowId(executionId));
  }

  it('resumes the parked run; once the run has closed, a verdict answers run_not_found', async () => {
    const taskQueue = 'resolve-node-resume';
    const executionId = 'resolve-node-resume-execution';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const engine = createEngine(taskQueue);
    const handle = await submit(engine, executionId, SINGLE_GATE_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      await whenAnnounced(store, 'gate');
      expect(await engine.resolveNode(executionId, 'gate', { output: 'approved' })).toEqual({});
      await handle.result();
    });

    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(harness.inputsSeen.after.gate).toBe('approved');
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);

    // The server answers for a closed run on its own; no worker is involved.
    expect(await engine.resolveNode(executionId, 'gate', { output: 'late' })).toMatchObject({
      error: { code: 'run_not_found', message: expect.any(String) },
    });
  }, 120_000);

  it('answers each rejection as a result and leaves the parked run resolvable', async () => {
    const taskQueue = 'resolve-node-rejections';
    const executionId = 'resolve-node-rejections-execution';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const engine = createEngine(taskQueue);
    const handle = await submit(engine, executionId, TWO_GATES_GRAPH);

    const worker = await createWorker(taskQueue, store, harness);
    await worker.runUntil(async () => {
      await Promise.all([whenAnnounced(store, 'gate-a'), whenAnnounced(store, 'gate-b')]);

      expect(await engine.resolveNode(executionId, 'ghost', { output: 1 })).toMatchObject({
        error: { code: 'verdict_for_unknown_node', message: expect.any(String) },
      });
      expect(await engine.resolveNode(executionId, 'join', { output: 1 })).toMatchObject({
        error: { code: 'node_not_waiting', message: expect.any(String) },
      });
      // Well-typed for the port, refused by the validator: the reserved port name.
      expect(await engine.resolveNode(executionId, 'gate-a', { output: 1, nextPort: 'errorRoute' })).toMatchObject({
        error: { code: 'verdict_malformed', message: expect.any(String) },
      });

      expect(await engine.resolveNode(executionId, 'gate-a', { output: 'first' })).toEqual({});
      expect(await engine.resolveNode(executionId, 'gate-a', { output: 'second' })).toMatchObject({
        error: { code: 'verdict_already_delivered', message: expect.any(String) },
      });
      expect(await engine.resolveNode(executionId, 'gate-b', { output: 'b-verdict' })).toEqual({});
      await handle.result();
    });

    expect(harness.inputsSeen.join['gate-a']).toBe('first');
    expect(harness.inputsSeen.join['gate-b']).toBe('b-verdict');
    expect(harness.executed.filter((id) => id === 'join')).toHaveLength(1);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);

  it('with no worker the verdict answers delivery_timeout at the deadline; the retry lands, or hears that the first one did', async () => {
    const taskQueue = 'resolve-node-timeout';
    const executionId = 'resolve-node-timeout-execution';
    const store = createRecordingStore();
    const harness = createPauseExecutors();
    const engine = createEngine(taskQueue);
    // Only the call meant to time out gets the short deadline: the retry below races a
    // worker's cold start, which the default deadline is sized for.
    const impatient = createEngine(taskQueue, { resolveTimeoutMs: 1000 });
    const handle = await submit(engine, executionId, SINGLE_GATE_GRAPH);

    const worker1 = await createWorker(taskQueue, store, harness);
    await worker1.runUntil(
      waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status'),
    );

    // Parked, and nobody polls the queue: the update cannot reach a validator.
    const startedAt = Date.now();
    const timedOut = await impatient.resolveNode(executionId, 'gate', { output: 'first attempt' });
    const elapsedMs = Date.now() - startedAt;
    expect(timedOut).toMatchObject({ error: { code: 'delivery_timeout', message: expect.any(String) } });
    expect(elapsedMs).toBeGreaterThanOrEqual(900);
    expect(elapsedMs).toBeLessThan(5000);

    let retry: ResolveNodeResult | undefined;
    const worker2 = await createWorker(taskQueue, store, harness);
    await worker2.runUntil(async () => {
      retry = await engine.resolveNode(executionId, 'gate', { output: 'retry' });
      await handle.result();
    });

    // The abandoned update is not durable, but the server may still hold it and hand it
    // to the next worker. The retry's answer says which of the two landed; exactly one did.
    expect(retry).toBeDefined();
    if (retry?.error !== undefined) {
      expect(retry.error.code).toBe('verdict_already_delivered');
    }
    expect(harness.inputsSeen.after.gate).toBe(retry?.error === undefined ? 'retry' : 'first attempt');
    expect(harness.executed).toEqual(['start', 'gate', 'after']);
    expect(store.statuses.map((entry) => entry.status)).toEqual(['waiting', 'running', 'completed']);
  }, 120_000);
});

// Temporal replay validates command determinism that runner re-execution alone cannot cover.
// Audit these tests enforce: ../../../execution-core/replay-audit.md
// The SDK exposes History through this deep import; historyToJSON matches Temporal CLI history JSON.
import { type History, historyToJSON } from '@temporalio/common/lib/proto-utils';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  RUN_WORKFLOW_NAME,
  WorkflowBuilderPlugin,
  type WorkflowExecutionInput,
  executionWorkflowId,
} from '../../src/index';
import { type RecordingStore, createRecordingStore } from '../fixtures/recording-store';
import { REPLAY_SCENARIOS, type ReplayScenario, type ReplayScenarioNode } from '../fixtures/replay-scenarios';

const TASK_QUEUE = 'replay-test';
// Its own queue, so a worker left polling from the first run cannot pick up a task from
// the cache-off run and serve it with the cache on.
const CACHE_OFF_TASK_QUEUE = 'replay-test-cache-off';

const HISTORIES_DIR = new URL('histories/', import.meta.url);

// Recording replaces a cross-version baseline; follow ./README.md before enabling it.
//   UPDATE_REPLAY_HISTORIES=<scenario>[,<scenario>] pnpm --filter @workflowbuilder/temporal test
//   UPDATE_REPLAY_HISTORIES=1                        re-records every scenario
const requested = process.env.UPDATE_REPLAY_HISTORIES;
const requestedScenarios =
  requested === undefined || requested === '1'
    ? []
    : requested
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
const unknownScenarios = requestedScenarios.filter((name) => !REPLAY_SCENARIOS.some((s) => s.name === name));
if (unknownScenarios.length > 0) {
  throw new Error(`UPDATE_REPLAY_HISTORIES names no scenario: ${unknownScenarios.join(', ')}`);
}

function shouldRecord(scenario: ReplayScenario): boolean {
  return requested === '1' || requestedScenarios.includes(scenario.name);
}

// The prefix files a recording under the version that recorded it, so older versions keep
// their histories next to newer ones. `v0` is the pre-release baseline; ./README.md says
// when to record under a released version instead.
const RECORD_PREFIX = process.env.REPLAY_HISTORY_VERSION ?? 'v0';

function historyFile(scenario: ReplayScenario): URL {
  return new URL(`${RECORD_PREFIX}-${scenario.name}.json`, HISTORIES_DIR);
}

function scenarioOf(file: string): ReplayScenario | undefined {
  return REPLAY_SCENARIOS.find((scenario) => file.endsWith(`-${scenario.name}.json`));
}

function countScheduledActivities(history: History): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of history.events ?? []) {
    const name = event.activityTaskScheduledEventAttributes?.activityType?.name;
    if (name) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }

  return counts;
}

// Seeded from the graph, so a node that emitted nothing is asserted as [] rather than
// passing by being absent, and grouping keeps the check off sibling completion order.
function eventTypesByNode(scenario: ReplayScenario, store: RecordingStore): Record<string, string[]> {
  const byNode: Record<string, string[]> = Object.fromEntries(scenario.graph.nodes.map((node) => [node.id, []]));

  for (const event of store.events) {
    if (event.nodeId !== undefined) {
      byNode[event.nodeId]?.push(event.type);
    }
  }

  return byNode;
}

describe('replay', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };

  async function runScenario(
    scenario: ReplayScenario,
    options: { executionId: string; taskQueue: string; maxCachedWorkflows?: number },
  ): Promise<{ history: History; store: RecordingStore }> {
    const store = createRecordingStore();
    const { executors, drive } = scenario.stage();

    const plugin = new WorkflowBuilderPlugin<ReplayScenarioNode>({ store, executors, taskQueue: options.taskQueue });
    const worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: plugin.taskQueue,
      workflowBundle,
      plugins: [plugin],
      maxCachedWorkflows: options.maxCachedWorkflows,
    });

    const input: WorkflowExecutionInput<ReplayScenarioNode> = {
      workflowId: scenario.graph.workflowId,
      executionId: options.executionId,
      definition: scenario.graph,
      triggerPayload: {},
      variables: {},
      global: {},
    };

    const workflowId = executionWorkflowId(options.executionId);

    await worker.runUntil(async () => {
      const handle = await env.client.workflow.start(RUN_WORKFLOW_NAME, {
        taskQueue: plugin.taskQueue,
        workflowId,
        args: [input],
      });
      await drive(handle);
    });

    return { history: await env.client.workflow.getHandle(workflowId).fetchHistory(), store };
  }

  beforeAll(async () => {
    [workflowBundle, env] = await Promise.all([
      bundleWorkflowCode({ workflowsPath: fileURLToPath(new URL('../fixtures/workflows.ts', import.meta.url)) }),
      TestWorkflowEnvironment.createLocal(),
    ]);
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  describe.each(REPLAY_SCENARIOS)('$name', (scenario) => {
    let history: History;
    let store: RecordingStore;

    beforeAll(async () => {
      ({ history, store } = await runScenario(scenario, {
        executionId: `replay-${scenario.name}`,
        taskQueue: TASK_QUEUE,
      }));

      if (shouldRecord(scenario)) {
        const target = historyFile(scenario);
        // Overwriting resets what a recording guards (rule 3 in ./README.md), so a re-baseline has to say so.
        if (existsSync(target) && process.env.REPLAY_HISTORY_OVERWRITE !== '1') {
          throw new Error(
            `${fileURLToPath(target)} already exists. Set REPLAY_HISTORY_VERSION to the new version, or REPLAY_HISTORY_OVERWRITE=1 to re-baseline it.`,
          );
        }
        await writeFile(target, `${historyToJSON(history)}\n`);
      }
    }, 120_000);

    it(`ends with ${scenario.terminalEvent} and status ${scenario.terminalStatus}`, () => {
      expect(store.events.at(0)?.type).toBe('execution_started');
      expect(store.events.at(-1)?.type).toBe(scenario.terminalEvent);
      expect(store.statuses).toEqual([
        { status: scenario.terminalStatus, errorMessage: scenario.terminalErrorMessage },
      ]);
    });

    it('emits the events each node owes', () => {
      expect(eventTypesByNode(scenario, store)).toEqual(scenario.nodeEvents);
    });

    it(`closes the Workflow Execution through ${scenario.closeAttributes}`, () => {
      expect(history.events?.at(-1)?.[scenario.closeAttributes]).toBeTruthy();
    });

    it('schedules one activity per node run, one per emitted event, one status write', () => {
      expect(countScheduledActivities(history)).toEqual(scenario.expectedActivities);
    });

    it('replays the history it just recorded', async () => {
      await expect(Worker.runReplayHistory({ workflowBundle }, history)).resolves.toBeUndefined();
    });

    it('repeats no side effect with the workflow cache off', async () => {
      // Every workflow task replays from the first event instead of resuming; see ./README.md.
      const cacheOff = await runScenario(scenario, {
        executionId: `replay-${scenario.name}-cache-off`,
        taskQueue: CACHE_OFF_TASK_QUEUE,
        maxCachedWorkflows: 0,
      });

      expect(countScheduledActivities(cacheOff.history)).toEqual(scenario.expectedActivities);
      // Numbers, not just the count: a repeat that also skips a write keeps the length.
      expect(cacheOff.store.events.map((event) => event.sequence)).toEqual(store.events.map((event) => event.sequence));
      expect(eventTypesByNode(scenario, cacheOff.store)).toEqual(scenario.nodeEvents);
      expect(cacheOff.store.statuses).toEqual(store.statuses);
    }, 120_000);
  });

  it('replays every history recorded before the current code', async () => {
    // `scenarioOf` matches on suffix, so a name ending in `-<other name>` would let the
    // shorter scenario claim the longer one's file and blame the wrong scenario on failure.
    const nested = REPLAY_SCENARIOS.filter((scenario) =>
      REPLAY_SCENARIOS.some((other) => other !== scenario && scenario.name.endsWith(`-${other.name}`)),
    );
    expect(nested.map((scenario) => scenario.name)).toEqual([]);

    // Every scenario needs a recording and every recording needs a scenario. The version
    // prefix is free, since older versions keep their files next to newer ones.
    const entries = await readdir(HISTORIES_DIR);
    const files = entries.filter((file) => file.endsWith('.json')).sort();
    expect(files.filter((file) => scenarioOf(file) === undefined)).toEqual([]);
    expect(REPLAY_SCENARIOS.filter((scenario) => !files.some((file) => scenarioOf(file) === scenario))).toEqual([]);

    const histories = await Promise.all(
      files.map(async (file) => ({
        workflowId: file,
        history: JSON.parse(await readFile(new URL(file, HISTORIES_DIR), 'utf8')) as unknown,
      })),
    );

    // The plural form, so one broken history cannot hide the rest.
    const failures: string[] = [];
    for await (const result of Worker.runReplayHistories({ workflowBundle }, histories)) {
      if (result.error) {
        failures.push(`${result.workflowId}: ${result.error.message}`);
      }
    }

    expect(failures).toEqual([]);
  }, 120_000);
});

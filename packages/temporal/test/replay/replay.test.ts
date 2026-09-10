// Temporal replay validates command determinism that runner re-execution alone cannot cover.
// Audit these tests enforce: ../../../execution-core/replay-audit.md
// The SDK exposes History through this deep import; historyToJSON matches Temporal CLI history JSON.
import { type History, historyToJSON } from '@temporalio/common/lib/proto-utils';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker, bundleWorkflowCode } from '@temporalio/worker';
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

const HISTORIES_DIR = new URL('histories/', import.meta.url);

// Recording replaces a cross-version baseline; follow ./README.md before enabling it.
//   UPDATE_REPLAY_HISTORIES=<scenario>[,<scenario>] pnpm --filter @workflowbuilder/temporal test
//   UPDATE_REPLAY_HISTORIES=1                        re-records every scenario
const requested = process.env.UPDATE_REPLAY_HISTORIES;
const requestedScenarios = requested === undefined || requested === '1' ? [] : requested.split(',');
const unknownScenarios = requestedScenarios.filter((name) => !REPLAY_SCENARIOS.some((s) => s.name === name));
if (unknownScenarios.length > 0) {
  throw new Error(`UPDATE_REPLAY_HISTORIES names no scenario: ${unknownScenarios.join(', ')}`);
}

function shouldRecord(scenario: ReplayScenario): boolean {
  return requested === '1' || requestedScenarios.includes(scenario.name);
}

// `v0-` names the pre-release baseline; ./README.md says what happens to it at the first release.
function historyFile(scenario: ReplayScenario): URL {
  return new URL(`v0-${scenario.name}.json`, HISTORIES_DIR);
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

describe('replay', () => {
  let env: TestWorkflowEnvironment;
  let workflowBundle: { code: string };

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
      store = createRecordingStore();
      const { executors, drive } = scenario.stage();

      const plugin = new WorkflowBuilderPlugin<ReplayScenarioNode>({ store, executors, taskQueue: TASK_QUEUE });
      const worker = await Worker.create({
        connection: env.nativeConnection,
        namespace: env.namespace,
        taskQueue: plugin.taskQueue,
        workflowBundle,
        plugins: [plugin],
      });

      const executionId = `replay-${scenario.name}`;
      const input: WorkflowExecutionInput<ReplayScenarioNode> = {
        workflowId: scenario.graph.workflowId,
        executionId,
        definition: scenario.graph,
        triggerPayload: {},
        variables: {},
        global: {},
      };

      const workflowId = executionWorkflowId(executionId);

      await worker.runUntil(async () => {
        const handle = await env.client.workflow.start(RUN_WORKFLOW_NAME, {
          taskQueue: plugin.taskQueue,
          workflowId,
          args: [input],
        });
        await drive(handle);
      });

      history = await env.client.workflow.getHandle(workflowId).fetchHistory();

      if (shouldRecord(scenario)) {
        await writeFile(historyFile(scenario), `${historyToJSON(history)}\n`);
      }
    }, 120_000);

    it(`ends with ${scenario.terminalEvent} and status ${scenario.terminalStatus}`, () => {
      expect(store.events.at(0)?.type).toBe('execution_started');
      expect(store.events.at(-1)?.type).toBe(scenario.terminalEvent);
      expect(store.statuses).toEqual([expect.objectContaining({ status: scenario.terminalStatus })]);
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
  });

  it('replays every history recorded before the current code', async () => {
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

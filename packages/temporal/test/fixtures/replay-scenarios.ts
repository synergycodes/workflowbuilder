// One scenario per path through the sandbox code; each gets its own committed history
// under ../replay/histories/. ../replay/README.md says what each protects.
import { WorkflowFailedError, type WorkflowHandle } from '@temporalio/client';

import {
  type BaseNode,
  type NodeExecutorRegistry,
  PermanentNodeExecutionError,
  type WorkflowDefinition,
} from '../../src/index';
import { resolveNodeUpdate } from '../../src/workflow/index';
import { executeVerdictWithRetry, waitUntil } from './helpers';
import { type PauseTestNode, SINGLE_GATE_GRAPH } from './pause-graph';
import type { RecordingStore } from './recording-store';

export type ReplayScenarioNode =
  | (BaseNode & { type: 'test/step' })
  | (BaseNode & { type: 'test/fail' })
  | (BaseNode & { type: 'test/route' })
  | (BaseNode & { type: 'test/block' })
  | PauseTestNode;

type ActivityCounts = { executeNode: number; emitEvent: number; updateStatus: number };

type WorkflowCloseAttributes =
  | 'workflowExecutionCompletedEventAttributes'
  | 'workflowExecutionFailedEventAttributes'
  | 'workflowExecutionCanceledEventAttributes';

export type ReplayScenario = {
  name: string;
  graph: WorkflowDefinition<ReplayScenarioNode>;
  terminalEvent: string;
  // Every status write in order; the last one is the terminal write.
  statuses: string[];
  terminalErrorMessage?: string;
  closeAttributes: WorkflowCloseAttributes;
  expectedActivities: ActivityCounts;
  // Keyed by node id, so the assertion does not depend on the order siblings finish in.
  // Every node in the graph needs an entry; one that never ran gets an empty list.
  nodeEvents: Record<string, string[]>;
  // Executors and the driver are built together, per run, so a scenario can share
  // run-local state between them (the blocked node the cancel scenario releases). The
  // driver also sees the store, which is where a parked run announces it can take a verdict.
  stage(): {
    executors: NodeExecutorRegistry<ReplayScenarioNode>;
    drive(handle: WorkflowHandle, store: RecordingStore): Promise<void>;
  };
};

const UNWIRED_PORT = 'no';

const executors: NodeExecutorRegistry<ReplayScenarioNode> = {
  'test/step': (node, context) => ({ output: { visited: node.id, after: Object.keys(context.nodeOutputs).sort() } }),
  'test/fail': () => {
    throw new PermanentNodeExecutionError('replay_fixture_failure', 'fails on purpose');
  },
  'test/route': () => ({ output: null, nextPort: UNWIRED_PORT }),
  'test/block': () => {
    throw new Error('test/block is staged by the cancel-mid-run scenario only');
  },
  'test/gate': () => ({ waiting: true }),
};

// How a run ended is asserted from the store and the history, not from the result — but
// only the run's own failure is swallowed, so a client or connection fault surfaces here
// instead of as a puzzling assertion later. A cancelled run also arrives as this class.
async function settle(handle: WorkflowHandle): Promise<void> {
  try {
    await handle.result();
  } catch (error) {
    if (!(error instanceof WorkflowFailedError)) throw error;
  }
}

export const REPLAY_SCENARIOS: ReplayScenario[] = [
  {
    // start ─┬─▶ left ──┬─▶ join   The fan-out is the point: it is the only shape that
    //        └─▶ right ─┘          puts two commands in one workflow task.
    name: 'parallel-wave',
    graph: {
      workflowId: 'replay-test-workflow',
      nodes: [
        { id: 'start', type: 'test/step', role: 'start', config: { label: 'start' } },
        { id: 'left', type: 'test/step', config: { label: 'left' } },
        { id: 'right', type: 'test/step', config: { label: 'right' } },
        { id: 'join', type: 'test/step', config: { label: 'join' } },
      ],
      edges: [
        { id: 'e-start-left', sourceNodeId: 'start', targetNodeId: 'left' },
        { id: 'e-start-right', sourceNodeId: 'start', targetNodeId: 'right' },
        { id: 'e-left-join', sourceNodeId: 'left', targetNodeId: 'join' },
        { id: 'e-right-join', sourceNodeId: 'right', targetNodeId: 'join' },
      ],
    },
    terminalEvent: 'execution_completed',
    statuses: ['completed'],
    closeAttributes: 'workflowExecutionCompletedEventAttributes',
    expectedActivities: { executeNode: 4, emitEvent: 10, updateStatus: 1 },
    nodeEvents: {
      start: ['node_started', 'node_completed'],
      left: ['node_started', 'node_completed'],
      right: ['node_started', 'node_completed'],
      join: ['node_started', 'node_completed'],
    },
    stage: () => ({ executors, drive: settle }),
  },
  {
    // start ─┬─▶ fail ────┬─▶ join   fail throws under the default policy: the wave
    //        └─▶ sibling ─┘          still finishes, join is never reached, no skips.
    name: 'fail-policy',
    graph: {
      workflowId: 'replay-fail-policy',
      nodes: [
        { id: 'start', type: 'test/step', role: 'start', config: {} },
        { id: 'fail', type: 'test/fail', config: {} },
        { id: 'sibling', type: 'test/step', config: {} },
        { id: 'join', type: 'test/step', config: {} },
      ],
      edges: [
        { id: 'e-start-fail', sourceNodeId: 'start', targetNodeId: 'fail' },
        { id: 'e-start-sibling', sourceNodeId: 'start', targetNodeId: 'sibling' },
        { id: 'e-fail-join', sourceNodeId: 'fail', targetNodeId: 'join' },
        { id: 'e-sibling-join', sourceNodeId: 'sibling', targetNodeId: 'join' },
      ],
    },
    terminalEvent: 'execution_failed',
    statuses: ['failed'],
    terminalErrorMessage: 'fails on purpose',
    closeAttributes: 'workflowExecutionFailedEventAttributes',
    expectedActivities: { executeNode: 3, emitEvent: 8, updateStatus: 1 },
    // join is never reached under the fail policy, so it owes no event at all.
    nodeEvents: {
      start: ['node_started', 'node_completed'],
      fail: ['node_started', 'node_failed'],
      sibling: ['node_started', 'node_completed'],
      join: [],
    },
    stage: () => ({ executors, drive: settle }),
  },
  {
    // start ─▶ route ─[yes]─▶ taken   route names the 'no' port, which has no edge:
    //                                 taken is skipped and the run closes incomplete.
    name: 'incomplete-branch',
    graph: {
      workflowId: 'replay-incomplete-branch',
      nodes: [
        { id: 'start', type: 'test/step', role: 'start', config: {} },
        { id: 'route', type: 'test/route', config: {} },
        { id: 'taken', type: 'test/step', config: {} },
      ],
      edges: [
        { id: 'e-start-route', sourceNodeId: 'start', targetNodeId: 'route' },
        { id: 'e-route-taken', sourceNodeId: 'route', targetNodeId: 'taken', sourceHandle: 'yes' },
      ],
    },
    terminalEvent: 'execution_incomplete',
    statuses: ['incomplete'],
    closeAttributes: 'workflowExecutionCompletedEventAttributes',
    expectedActivities: { executeNode: 2, emitEvent: 7, updateStatus: 1 },
    nodeEvents: {
      start: ['node_started', 'node_completed'],
      route: ['node_started', 'node_completed'],
      taken: ['node_skipped'],
    },
    stage: () => ({ executors, drive: settle }),
  },
  {
    // start ─▶ block   block parks until released; the driver cancels the run while it
    //                  is in flight, then lets it finish so the worker can drain.
    name: 'cancel-mid-run',
    graph: {
      workflowId: 'replay-cancel-mid-run',
      nodes: [
        { id: 'start', type: 'test/step', role: 'start', config: {} },
        { id: 'block', type: 'test/block', config: {} },
      ],
      edges: [{ id: 'e-start-block', sourceNodeId: 'start', targetNodeId: 'block' }],
    },
    terminalEvent: 'execution_cancelled',
    statuses: ['cancelled'],
    closeAttributes: 'workflowExecutionCanceledEventAttributes',
    expectedActivities: { executeNode: 2, emitEvent: 5, updateStatus: 1 },
    // block is cancelled in flight, so it starts and never completes.
    nodeEvents: { start: ['node_started', 'node_completed'], block: ['node_started'] },
    stage: () => {
      let reached!: () => void;
      let release!: () => void;
      const blockReached = new Promise<void>((resolve) => (reached = resolve));
      const released = new Promise<void>((resolve) => (release = resolve));

      return {
        executors: {
          ...executors,
          'test/block': async () => {
            reached();
            await released;
            return { output: null };
          },
        },
        drive: async (handle) => {
          await blockReached;
          await handle.cancel();
          await settle(handle);
          // Released only now, so the cancel is recorded with the activity still open. The
          // late completion then meets a closed run; Temporal core logs that as a single
          // "Activity not found on completion" warning, which is expected here.
          release();
        },
      };
    },
  },
  {
    // start ─▶ gate ─▶ after   The middle node parks the run. The driver waits for the
    //                          `waiting` status, delivers a verdict and lets the run finish.
    name: 'parked-decision',
    graph: SINGLE_GATE_GRAPH,
    terminalEvent: 'execution_completed',
    statuses: ['waiting', 'running', 'completed'],
    closeAttributes: 'workflowExecutionCompletedEventAttributes',
    // The usual pair per node plus one node_waiting; one status write per transition.
    expectedActivities: { executeNode: 3, emitEvent: 9, updateStatus: 3 },
    nodeEvents: {
      start: ['node_started', 'node_completed'],
      gate: ['node_started', 'node_waiting', 'node_completed'],
      after: ['node_started', 'node_completed'],
    },
    stage: () => ({
      executors,
      drive: async (handle, store) => {
        await waitUntil(() => store.statuses.some((entry) => entry.status === 'waiting'), 'the waiting status');
        await executeVerdictWithRetry(() =>
          handle.executeUpdate(resolveNodeUpdate, { args: [{ nodeId: 'gate', resolution: { output: 'approved' } }] }),
        );
        await settle(handle);
      },
    }),
  },
];

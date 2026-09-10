// One scenario per path through the sandbox code; each gets its own committed history
// under ../replay/histories/. ../replay/README.md says what each protects.
import type { WorkflowHandle } from '@temporalio/client';

import {
  type BaseNode,
  type NodeExecutorRegistry,
  PermanentNodeExecutionError,
  type WorkflowDefinition,
} from '../../src/index';

export type ReplayScenarioNode =
  | (BaseNode & { type: 'test/step' })
  | (BaseNode & { type: 'test/fail' })
  | (BaseNode & { type: 'test/route' })
  | (BaseNode & { type: 'test/block' });

type ActivityCounts = { executeNode: number; emitEvent: number; updateStatus: number };

type WorkflowCloseAttributes =
  | 'workflowExecutionCompletedEventAttributes'
  | 'workflowExecutionFailedEventAttributes'
  | 'workflowExecutionCanceledEventAttributes';

export type ReplayScenario = {
  name: string;
  graph: WorkflowDefinition<ReplayScenarioNode>;
  terminalEvent: string;
  terminalStatus: string;
  closeAttributes: WorkflowCloseAttributes;
  expectedActivities: ActivityCounts;
  // Executors and the driver are built together, per run, so a scenario can share
  // run-local state between them (the blocked node the cancel scenario releases).
  stage(): {
    executors: NodeExecutorRegistry<ReplayScenarioNode>;
    drive(handle: WorkflowHandle): Promise<void>;
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
};

async function settle(handle: WorkflowHandle): Promise<void> {
  try {
    await handle.result();
  } catch {
    // How a run ended is asserted from the store and the history, not from the result.
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
    terminalStatus: 'completed',
    closeAttributes: 'workflowExecutionCompletedEventAttributes',
    expectedActivities: { executeNode: 4, emitEvent: 10, updateStatus: 1 },
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
    terminalStatus: 'failed',
    closeAttributes: 'workflowExecutionFailedEventAttributes',
    expectedActivities: { executeNode: 3, emitEvent: 8, updateStatus: 1 },
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
    terminalStatus: 'incomplete',
    closeAttributes: 'workflowExecutionCompletedEventAttributes',
    expectedActivities: { executeNode: 2, emitEvent: 7, updateStatus: 1 },
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
    terminalStatus: 'cancelled',
    closeAttributes: 'workflowExecutionCanceledEventAttributes',
    expectedActivities: { executeNode: 2, emitEvent: 5, updateStatus: 1 },
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
];

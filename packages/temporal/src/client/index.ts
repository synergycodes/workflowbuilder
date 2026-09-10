// Client-side entry point: starting and cancelling runs, delivering verdicts. Split from
// the root entry so a backend-only consumer never pulls in @temporalio/worker and its
// native binary.
import { Client, WorkflowNotFoundError } from '@temporalio/client';

import { DEFAULT_TASK_QUEUE, RESOLVE_NODE_UPDATE_NAME, RUN_WORKFLOW_NAME, executionWorkflowId } from '../constants';
import type {
  BaseNode,
  CompletedNodeExecution,
  ResolveNodeResult,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from '../core-contract';
// Type-only, so nothing from the workflow entry reaches this bundle at runtime — the
// client must not load @temporalio/workflow. It is imported purely to type the start
// and update calls below; see the note there.
import type { ResolveNodeUpdateInput, runWorkflow } from '../workflow/run-workflow';
import { mapResolveNodeError } from './resolve-node-result';

// Without a worker nobody validates an update, and the RPC would wait for the server's
// own limit. A timed-out update is not durable, yet the server may still hand it to the
// next worker: the caller resends and may hear verdict_already_delivered.
const DEFAULT_RESOLVE_TIMEOUT_MS = 10_000;

export type TemporalWorkflowEngineOptions = {
  // A ready client, or a factory awaited once on first use. The factory form keeps
  // process start independent of Temporal being reachable.
  client: Client | (() => Promise<Client>);
  // Must match the queue the worker serves — default on both sides is DEFAULT_TASK_QUEUE.
  taskQueue?: string;
  // How long resolveNode waits for the update to be accepted before answering delivery_timeout.
  resolveTimeoutMs?: number;
};

export class TemporalWorkflowEngine<TNode extends BaseNode = BaseNode> implements WorkflowEnginePort<TNode> {
  private readonly clientSource: Client | (() => Promise<Client>);
  private readonly taskQueue: string;
  private readonly resolveTimeoutMs: number;
  private clientPromise: Promise<Client> | undefined;

  constructor(options: TemporalWorkflowEngineOptions) {
    this.clientSource = options.client;
    this.taskQueue = options.taskQueue ?? DEFAULT_TASK_QUEUE;
    this.resolveTimeoutMs = options.resolveTimeoutMs ?? DEFAULT_RESOLVE_TIMEOUT_MS;
  }

  async submit(input: WorkflowExecutionInput<TNode>): Promise<void> {
    const client = await this.client();
    // The workflow is started by name, because the client process must not load
    // workflow code. Passing `typeof runWorkflow` as the type parameter is what makes
    // `args` checked all the same: the SDK resolves it to `Parameters<typeof
    // runWorkflow>`. Started with a bare string and no type parameter, `args` widens to
    // `any[]` and a mismatch between the two sides only surfaces in the sandbox at run
    // time.
    await client.workflow.start<typeof runWorkflow>(RUN_WORKFLOW_NAME, {
      taskQueue: this.taskQueue,
      workflowId: executionWorkflowId(input.executionId),
      args: [input],
    });
  }

  async cancel(executionId: string): Promise<void> {
    const client = await this.client();
    const handle = client.workflow.getHandle(executionWorkflowId(executionId));
    try {
      await handle.cancel();
    } catch (error) {
      // Cancel is idempotent from the caller's perspective — "not found" means already gone.
      if (error instanceof WorkflowNotFoundError) return;
      throw error;
    }
  }

  async resolveNode(
    executionId: string,
    nodeId: string,
    resolution: CompletedNodeExecution,
  ): Promise<ResolveNodeResult> {
    const client = await this.client();
    const handle = client.workflow.getHandle(executionWorkflowId(executionId));
    try {
      // Addressed by name and typed through the sandbox's input type, like `start` above.
      // The update id stays the SDK's random one: the server deduplicates by id, so a
      // deterministic id would hand a second decider the first decider's outcome as a success.
      await client.withDeadline(Date.now() + this.resolveTimeoutMs, () =>
        handle.executeUpdate<void, [ResolveNodeUpdateInput]>(RESOLVE_NODE_UPDATE_NAME, {
          args: [{ nodeId, resolution }],
        }),
      );
      return {};
    } catch (error) {
      return mapResolveNodeError(error);
    }
  }

  private client(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise =
        typeof this.clientSource === 'function' ? this.clientSource() : Promise.resolve(this.clientSource);
    }
    return this.clientPromise;
  }
}

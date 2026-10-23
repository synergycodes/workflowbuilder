// Client-side entry point: starting and cancelling runs, delivering verdicts. Split from
// the root entry so a backend-only consumer never pulls in @temporalio/worker and its
// native binary.
import { Client, WorkflowExecutionAlreadyStartedError, WorkflowNotFoundError } from '@temporalio/client';

import { DEFAULT_TASK_QUEUE, RESOLVE_NODE_UPDATE_NAME, RUN_WORKFLOW_NAME, executionWorkflowId } from '../constants';
import type {
  BaseNode,
  CancelResult,
  ResolveNodeInput,
  ResolveNodeResult,
  SubmitResult,
  WorkflowEnginePort,
  WorkflowExecutionInput,
} from '../core-contract';
// Type-only, so nothing from the workflow entry reaches this bundle at runtime — the
// client must not load @temporalio/workflow. It is imported purely to type the start
// and update calls below; see the note there.
import type { ResolveNodeUpdateInput, runWorkflow } from '../workflow/run-workflow';
import { mapResolveNodeError } from './resolve-node-result';

// Without a worker nobody validates an update, and the RPC would wait for the server's
// own limit. The deadline settles nothing about the update: it may already be accepted,
// or reach the next worker later, so a resend may hear verdict_already_delivered.
const DEFAULT_RESOLVE_TIMEOUT_MS = 10_000;

// A failed start has usually just waited out the connection; the check after it gets less.
const CONFIRM_START_TIMEOUT_MS = 5000;

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

  async submit(input: WorkflowExecutionInput<TNode>): Promise<SubmitResult> {
    const workflowId = executionWorkflowId(input.executionId);
    let client: Client;
    try {
      client = await this.client();
    } catch (error) {
      // Nothing was sent, so nothing was started.
      return { error: { code: 'run_not_started', message: messageOf(error) } };
    }
    try {
      // The workflow is started by name, because the client process must not load
      // workflow code. Passing `typeof runWorkflow` as the type parameter is what makes
      // `args` checked all the same: the SDK resolves it to `Parameters<typeof
      // runWorkflow>`. Started with a bare string and no type parameter, `args` widens to
      // `any[]` and a mismatch between the two sides only surfaces in the sandbox at run
      // time.
      await client.workflow.start<typeof runWorkflow>(RUN_WORKFLOW_NAME, {
        taskQueue: this.taskQueue,
        workflowId,
        args: [input],
      });
      return {};
    } catch (error) {
      // A repeat of a start that landed: the server has the run.
      if (error instanceof WorkflowExecutionAlreadyStartedError) return {};
      return this.confirmStart(client, workflowId, error);
    }
  }

  async cancel(executionId: string): Promise<CancelResult> {
    const client = await this.client();
    const handle = client.workflow.getHandle(executionWorkflowId(executionId));
    try {
      await handle.cancel();
      return {};
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        return { error: { code: 'run_not_found', message: messageOf(error) } };
      }
      throw error;
    }
  }

  // A start can fail after the server registered the run (a lost reply), so the server is
  // asked before the failure is reported as a run that does not exist.
  private async confirmStart(client: Client, workflowId: string, cause: unknown): Promise<SubmitResult> {
    try {
      await client.withDeadline(Date.now() + CONFIRM_START_TIMEOUT_MS, () =>
        client.workflow.getHandle(workflowId).describe(),
      );
      return {};
    } catch (error) {
      const code = error instanceof WorkflowNotFoundError ? 'run_not_started' : 'start_unconfirmed';
      return { error: { code, message: messageOf(cause) } };
    }
  }

  async resolveNode({ executionId, nodeId, resolution }: ResolveNodeInput): Promise<ResolveNodeResult> {
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

// The SDK wraps a transport failure in a generic message; the reason is down the cause chain.
function messageOf(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error && !parts.includes(current.message)) {
    if (current.message) parts.push(current.message);
    current = current.cause;
  }
  if (parts.length > 0) return parts.join(': ');
  return error instanceof Error ? error.name : String(error);
}

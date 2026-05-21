import { Client, Connection, WorkflowNotFoundError } from '@temporalio/client';

import type { WorkflowEnginePort, WorkflowExecutionInput } from '@workflow-builder/execution-core/workflow';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { env } from '../env';

const TASK_QUEUE = 'workflow-execution';

export class TemporalEngine implements WorkflowEnginePort<BaseNode> {
  private clientPromise: Promise<Client> | undefined;

  async submit(input: WorkflowExecutionInput<BaseNode>): Promise<void> {
    const client = await this.client();
    await client.workflow.start('runWorkflow', {
      taskQueue: TASK_QUEUE,
      workflowId: `execution-${input.executionId}`,
      args: [input],
    });
  }

  async cancel(executionId: string): Promise<void> {
    const client = await this.client();
    const handle = client.workflow.getHandle(`execution-${executionId}`);
    try {
      await handle.cancel();
    } catch (error) {
      // Cancel is idempotent from the caller's perspective — "not found" means already gone
      if (error instanceof WorkflowNotFoundError) return;
      throw error;
    }
  }

  private client(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = Connection.connect({ address: env.TEMPORAL_ADDRESS }).then(
        (connection) => new Client({ connection }),
      );
    }
    return this.clientPromise;
  }
}

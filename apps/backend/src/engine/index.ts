import { Client, Connection } from '@temporalio/client';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';

import type { WorkflowEnginePort } from '@workflow-builder/execution-core/workflow';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { env } from '../env';

let engine: WorkflowEnginePort<BaseNode> | undefined;

export function getWorkflowEngine(): WorkflowEnginePort<BaseNode> {
  if (!engine) {
    engine = new TemporalWorkflowEngine({
      // A factory rather than a ready client: the connection is opened on the first
      // submit, so booting the backend does not require Temporal to be reachable.
      client: async () => new Client({ connection: await Connection.connect({ address: env.TEMPORAL_ADDRESS }) }),
    });
  }
  return engine;
}

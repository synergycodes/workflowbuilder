import { Client, Connection } from '@temporalio/client';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';

import type { WorkflowEnginePort } from '@workflow-builder/execution-core/workflow';
import { temporalConfig } from '@workflow-builder/temporal-connection';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

let engine: WorkflowEnginePort<BaseNode> | undefined;

export function getWorkflowEngine(): WorkflowEnginePort<BaseNode> {
  if (!engine) {
    engine = new TemporalWorkflowEngine({
      // A factory rather than a ready client: the connection is opened on the first
      // submit, so booting the backend does not require Temporal to be reachable.
      // Misconfigured TEMPORAL_* values therefore surface on that first submit
      // rather than at boot.
      client: async () => {
        const temporal = temporalConfig();
        const connection = await Connection.connect(temporal.connection);
        return new Client({ connection, namespace: temporal.namespace });
      },
    });
  }
  return engine;
}

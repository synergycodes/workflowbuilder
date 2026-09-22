import { Client, Connection } from '@temporalio/client';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';

import type { WorkflowEnginePort } from '@workflow-builder/execution-core/workflow';
import { temporalConfig } from '@workflow-builder/temporal-connection';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

// Read here rather than inside the factory below, so a contradictory combination or
// an unreadable certificate stops the backend at boot, as it stops the worker.
// Neither parsing nor reading the PEM files needs Temporal to be reachable.
const temporal = temporalConfig();

let engine: WorkflowEnginePort<BaseNode> | undefined;

export function getWorkflowEngine(): WorkflowEnginePort<BaseNode> {
  if (!engine) {
    engine = new TemporalWorkflowEngine({
      // A factory rather than a ready client: the connection is opened on the first
      // submit, so booting the backend does not require Temporal to be reachable.
      client: async () => {
        const connection = await Connection.connect(temporal.connection);
        return new Client({ connection, namespace: temporal.namespace });
      },
    });
  }
  return engine;
}

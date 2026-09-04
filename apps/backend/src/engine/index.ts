import { Client, Connection } from '@temporalio/client';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';

import type { WorkflowEnginePort } from '@workflow-builder/execution-core/workflow';
import type { BaseNode } from '@workflow-builder/types/workflow-execution/execution-model';

import { env } from '../env';
import { buildTemporalConnectionOptions } from './temporal-connection';

let engine: WorkflowEnginePort<BaseNode> | undefined;

export function getWorkflowEngine(): WorkflowEnginePort<BaseNode> {
  if (!engine) {
    engine = new TemporalWorkflowEngine({
      // A factory rather than a ready client: the connection is opened on the first
      // submit, so booting the backend does not require Temporal to be reachable.
      // Misconfigured TEMPORAL_* values therefore surface on that first submit
      // rather than at boot.
      client: async () => {
        const connection = await Connection.connect({
          address: env.TEMPORAL_ADDRESS,
          ...buildTemporalConnectionOptions({
            tls: env.TEMPORAL_TLS,
            apiKey: env.TEMPORAL_API_KEY,
            caPath: env.TEMPORAL_TLS_CA_PATH,
            certPath: env.TEMPORAL_TLS_CERT_PATH,
            keyPath: env.TEMPORAL_TLS_KEY_PATH,
          }),
        });
        return new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });
      },
    });
  }
  return engine;
}

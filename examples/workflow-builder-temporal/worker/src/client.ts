import { Client, Connection, WorkflowFailedError } from '@temporalio/client';
import { executionWorkflowId } from '@workflowbuilder/temporal';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import type { DiagramSnapshot } from '../../shared/protocol';
import { drawTriggerPayload } from '../../shared/trigger-payload';
import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, WORKFLOW_ID, temporalUiUrl } from './config';
import { snapshotToDefinition } from './to-definition';

const snapshot = JSON.parse(
  await readFile(new URL('../../shared/diagram.json', import.meta.url), 'utf8'),
) as DiagramSnapshot;
const definition = snapshotToDefinition(snapshot, WORKFLOW_ID);

const client = new Client({
  connection: await Connection.connect({ address: TEMPORAL_ADDRESS }),
  namespace: TEMPORAL_NAMESPACE,
});
const engine = new TemporalWorkflowEngine({ client });

const executionId = randomUUID();
const triggerPayload = drawTriggerPayload();
await engine.submit({
  workflowId: WORKFLOW_ID,
  executionId,
  definition,
  triggerPayload,
  variables: {},
  global: {},
});

const workflowId = executionWorkflowId(executionId);
console.log(`amount ${triggerPayload.amount}`);
console.log(`started ${workflowId}`);
console.log(`watch it: ${temporalUiUrl(executionId)}`);

// The engine starts the run by name and returns at once. Waiting for the outcome is ordinary
// Temporal client code, so the sample shows it as such.
const handle = client.workflow.getHandle(workflowId);
try {
  await handle.result();
  console.log('run completed');
} catch (error) {
  if (!(error instanceof WorkflowFailedError)) throw error;
  const reason = error.cause instanceof Error ? error.cause.message : error.message;
  console.error(`run failed: ${reason}`);
  process.exitCode = 1;
} finally {
  await client.connection.close();
}

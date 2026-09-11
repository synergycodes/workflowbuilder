import { Client, Connection } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';
import { fileURLToPath } from 'node:url';

import { startBridge } from './bridge';
import { BRIDGE_PORT, TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from './config';
import { executors } from './executors';
import { createRunStore } from './store';

const store = createRunStore();

// The plugin owns how a graph executes. What each node does (`executors`) and where events
// land (`store`) are this file's, and that is the whole split.
const plugin = new WorkflowBuilderPlugin({ executors, store });

const worker = await Worker.create({
  connection: await NativeConnection.connect({ address: TEMPORAL_ADDRESS }),
  namespace: TEMPORAL_NAMESPACE,
  taskQueue: plugin.taskQueue,
  workflowsPath: fileURLToPath(new URL('workflows.ts', import.meta.url)),
  plugins: [plugin],
});

// The editor never talks to Temporal itself. It posts a canvas snapshot here and reads the
// store's events back, so the browser needs one origin and no Temporal client.
const engine = new TemporalWorkflowEngine({
  client: async () =>
    new Client({ connection: await Connection.connect({ address: TEMPORAL_ADDRESS }), namespace: TEMPORAL_NAMESPACE }),
});
const bridge = startBridge({ engine, store, port: BRIDGE_PORT });

console.log(`worker polling task queue "${plugin.taskQueue}" on ${TEMPORAL_ADDRESS}`);
await worker.run();
bridge.close();

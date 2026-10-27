import type { Client } from '@temporalio/client';
import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import { TemporalWorkflowEngine, lazyClient } from '@workflowbuilder/temporal/client';
import { fileURLToPath } from 'node:url';

import { closeBridge, startBridge } from './bridge';
import { BRIDGE_PORT, TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from './config';
import { executors } from './executors';
import { createRunStore } from './store';

const store = createRunStore();

// The plugin owns how a graph executes. What each node does (`executors`) and where events
// land (`store`) are this file's, and that is the whole split.
const plugin = new WorkflowBuilderPlugin({ executors, store });

const workerConnection = await NativeConnection.connect({ address: TEMPORAL_ADDRESS });
const worker = await Worker.create({
  connection: workerConnection,
  namespace: TEMPORAL_NAMESPACE,
  taskQueue: plugin.taskQueue,
  workflowsPath: fileURLToPath(new URL('workflows.ts', import.meta.url)),
  plugins: [plugin],
});

// The editor never talks to Temporal itself. It posts a canvas snapshot here and reads the
// store's events back, so the browser needs one origin and no Temporal client.
// The engine connects on the first run and again after a failed attempt, and lazyClient closes
// the connection of each failed one. The client that connects is kept so shutdown can close it.
const connectBridge = lazyClient({ address: TEMPORAL_ADDRESS }, { namespace: TEMPORAL_NAMESPACE });
let bridgeClient: Client | undefined;
const engine = new TemporalWorkflowEngine({
  client: async () => {
    bridgeClient = await connectBridge();
    return bridgeClient;
  },
});
const bridge = startBridge({ engine, store, port: BRIDGE_PORT });

console.log(`worker polling task queue "${plugin.taskQueue}" on ${TEMPORAL_ADDRESS}`);
try {
  await worker.run();
} finally {
  await closeBridge(bridge);
  await bridgeClient?.connection.close();
  await workerConnection.close();
}

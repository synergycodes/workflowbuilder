import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import { fileURLToPath } from 'node:url';

import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from './config';
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

console.log(`worker polling task queue "${plugin.taskQueue}" on ${TEMPORAL_ADDRESS}`);
await worker.run();

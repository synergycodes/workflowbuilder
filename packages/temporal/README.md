# @workflowbuilder/temporal

Run [Workflow Builder](https://www.workflowbuilder.io) diagrams as durable [Temporal](https://temporal.io) Workflow Executions.

A diagram authored on the canvas becomes one Temporal Workflow Execution. Each node becomes an Activity, so retries, timeouts, cancellation and full Event History come from Temporal. This package is a Temporal Plugin: it registers the activities that execute a graph, and ships the workflow-side runner you re-export from your own workflows module.

What it owns and what stays yours:

| This package                                         | Your application                                         |
| ---------------------------------------------------- | -------------------------------------------------------- |
| How a graph executes: traversal, waves, error policy | What each node does: one executor function per node type |
| Event ordering and sequence numbering                | Where events and statuses are persisted (the store port) |
| The activity contract and its default timeouts       | Connection, credentials, deployment                      |

## Install

```bash
npm install @workflowbuilder/temporal
```

On the worker side you also need Temporal's worker package, which stays yours because it
owns the process:

```bash
npm install @temporalio/worker
```

Everything else this package imports at run time (`@temporalio/client`, `workflow`,
`plugin`) comes with it, following the same pattern as Temporal's own plugins.

**Keep `@temporalio/worker` on the same version line as this package's Temporal
dependencies.** The SDK packages are released together and reference each other across
package boundaries, and the workflow sandbox in particular has to agree with the worker
running it. This package tracks one SDK line at a time; the version it was built against
is in its `dependencies`.

## Worker

```ts
import { NativeConnection, Worker } from '@temporalio/worker';
import { WorkflowBuilderPlugin } from '@workflowbuilder/temporal';
import { fileURLToPath } from 'node:url';

const plugin = new WorkflowBuilderPlugin({
  // One executor per node type. Whatever your nodes do lives here.
  executors: {
    'my-app/http-request': async (node, context) => ({ output: await callApi(node.config, context) }),
    'my-app/decision': (node, context) => ({ output: null, nextPort: pickBranch(node, context) }),
  },
  // Where execution events and status transitions land.
  store: {
    async emitExecutionEvent(executionId, sequence, type, payload, nodeId) {
      /* insert a row */
    },
    async updateExecutionStatus(executionId, status, errorMessage) {
      /* update the run */
    },
  },
});

const worker = await Worker.create({
  connection: await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS }),
  taskQueue: plugin.taskQueue,
  workflowsPath: fileURLToPath(new URL('workflows.ts', import.meta.url)),
  plugins: [plugin],
});

await worker.run();
```

### workflows.ts

```ts
export { runWorkflow } from '@workflowbuilder/temporal/workflow';
```

That one line is required. The TypeScript SDK builds the workflow bundle from a single module, so a plugin cannot register a workflow on your behalf. Re-exporting it from your own workflows module is how the bundle picks it up. (Temporal's own AI SDK plugin has the same constraint.)

The same constraint is why anything configurable about the workflow is configured here rather than on the plugin. To give some node types their own timeout and retry cap, build the workflow instead of re-exporting it:

```ts
import { DEFAULT_NODE_ACTIVITY_PROFILE, createRunWorkflow } from '@workflowbuilder/temporal/workflow';

export const runWorkflow = createRunWorkflow({
  nodeActivityProfiles: {
    // A thinking-mode model needs room; keep an explicit retry cap.
    'my-product/ai-agent': { startToCloseTimeout: '30m', retry: { maximumAttempts: 3 } },
    // Change one field and inherit the rest.
    'my-product/decision': { ...DEFAULT_NODE_ACTIVITY_PROFILE, startToCloseTimeout: '30s' },
  },
});
```

Keep the export named `runWorkflow`: that is the name the client starts, and a test pins the two together.

Entries are whole profiles rather than partials on purpose. A partial would let you set a timeout and silently drop the retry cap, and what Temporal falls back to is unlimited retries with backoff, which on a permanently failing model call is an unbounded bill. A node type with no entry resolves to `DEFAULT_NODE_ACTIVITY_PROFILE` and nothing else.

## Client

```ts
import { Client, Connection } from '@temporalio/client';
import { TemporalWorkflowEngine } from '@workflowbuilder/temporal/client';

const engine = new TemporalWorkflowEngine({
  // A ready Client, or a factory awaited on first use so process start does not
  // depend on Temporal being reachable.
  client: async () => new Client({ connection: await Connection.connect({ address }) }),
});

await engine.submit({ workflowId, executionId, definition, triggerPayload: {}, variables: {}, global: {} });
await engine.cancel(executionId);
```

The engine and the worker default to the same task queue (`workflow-execution`). Override it in both places together, or leave both alone.

## What the plugin does not do

Three things are deliberately yours, and knowing which they are makes debugging much easier:

- **It does not bundle the workflow.** See `workflows.ts` above.
- **It does not open the connection.** Connection, TLS and credentials stay in your code.
- **It does not own storage.** Persistence arrives through the `store` port, so any database works.

## Entry points

| Import                               | Use it for                                                           |
| ------------------------------------ | -------------------------------------------------------------------- |
| `@workflowbuilder/temporal`          | Worker side: the plugin, `createActivities`, shared constants, types |
| `@workflowbuilder/temporal/client`   | Starting and cancelling runs                                         |
| `@workflowbuilder/temporal/workflow` | Sandbox-safe: `runWorkflow` to re-export, event emitter, profiles    |

`/workflow` is the only entry point that is safe inside Temporal's V8 sandbox. The split also means a backend that only starts runs never pulls in the worker package and its native binary.

## Default activity profiles

Node activities get 10 minutes and 2 attempts, because a node may call a model. The two database activities get 30 seconds and 5 attempts, because they are fast idempotent writes. Both are exported (`DEFAULT_NODE_ACTIVITY_PROFILE`, `DEFAULT_DATABASE_ACTIVITY_PROFILE`) and pinned by a test, so an upgrade cannot silently change how long your nodes are allowed to run.

Per-node-type overrides go through `createRunWorkflow` (see `workflows.ts` above). `resolveNodeActivityOptions` is exported from `/workflow` so you can unit-test your own profile map against the same resolution the workflow uses, instead of reading it back out of Event History.

## Node labels in Event History

Each node activity is scheduled with the node's authored label as its Temporal Summary, so Event History lists the names from your diagram instead of a column of identical `executeNode` rows. Nothing to configure: the label travels on the node, and a node without one simply gets no summary, where Temporal falls back to showing the activity type.

## Versioning and replay

This package carries two contracts, not one. The API is the ordinary semver surface. The second is replay compatibility: a workflow can sit in Event History for days, and a new version of this package has to be able to replay a history that an older version recorded.

| Release | API                      | Replay                                                              |
| ------- | ------------------------ | ------------------------------------------------------------------- |
| patch   | no changes               | histories from older versions replay unchanged                      |
| minor   | additions only           | histories still replay; new behaviour sits behind `patched()`       |
| major   | breaking changes allowed | replay may break, and the release notes say to drain in-flight runs |

Pre-1.0 the API surface may still move between minor versions. It is reviewed deliberately, not incidentally.

Two notes on the moving parts underneath: Temporal's plugin API is marked experimental upstream, and this package is deliberately a thin layer over `SimplePlugin` to keep that exposure small. The package ships as ESM only.

## License

Apache-2.0

# @workflowbuilder/temporal

Run [Workflow Builder](https://www.workflowbuilder.io) diagrams as durable [Temporal](https://temporal.io) Workflow Executions.

[![npm version](https://img.shields.io/npm/v/@workflowbuilder/temporal.svg)](https://www.npmjs.com/package/@workflowbuilder/temporal)
[![license](https://img.shields.io/npm/l/@workflowbuilder/temporal.svg)](./LICENSE)

- **Source:** <https://github.com/synergycodes/workflowbuilder/tree/main/packages/temporal>
- **Changelog:** <https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/CHANGELOG.md>
- **Issues:** <https://github.com/synergycodes/workflowbuilder/issues>
- **Live demo:** <https://app.workflowbuilder.io/>
- **Requires:** Node.js 20.3 or newer, ESM. Tested against the `1.23` line of the Temporal TypeScript SDK.
- **Status:** pre-1.0. The API may still move between minor versions, see [Versioning and replay](#versioning-and-replay).

Workflow Builder is a React SDK for a visual, flow-based workflow editor. What people draw on its canvas is a diagram: a JSON graph of typed nodes and edges. This package runs that graph on Temporal. A diagram becomes one Workflow Execution and each node becomes an Activity, so retries, timeouts, cancellation and full Event History come from Temporal. Each node activity carries the node's label as its Summary, so Event History reads like the diagram. It is a Temporal Plugin: it registers the activities that execute a graph and ships the workflow-side runner you re-export from your own workflows module.

What it owns and what stays yours:

| This package                                         | Your application                                         |
| ---------------------------------------------------- | -------------------------------------------------------- |
| How a graph executes: traversal, waves, error policy | What each node does: one executor function per node type |
| Event ordering and sequence numbering                | Where events and statuses are persisted (the store port) |
| The activity contract and its default timeouts       | Connection, credentials, deployment                      |

## Install

```bash
npm install @workflowbuilder/temporal @temporalio/worker @temporalio/activity @temporalio/client @temporalio/workflow @temporalio/plugin
```

The `@temporalio/*` packages are peer dependencies, as in Temporal's own plugins, and **all of them have to be one version**. Temporal's packages pin each other exactly, and the activity context lives in module scope: a second copy of `@temporalio/activity` next to the worker's own makes `activityInfo()` come back empty at run time instead of failing at install. Listing them explicitly, at the version your worker uses, is what keeps a package manager from resolving a newer one for this package alone.

A backend that only starts and cancels runs uses `@temporalio/client` at run time, but declare the other peers too, at the same version, so the package manager does not pick its own. `@temporalio/worker` is the one it may leave out, and it is an optional peer for exactly that reason. This release is tested against the `1.23` line.

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
    async updateExecutionStatus(executionId, status, errorMessage, outcome) {
      /* update the run; the terminal 'completed' write may carry the run's outcome */
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

This file is yours, and `workflowsPath` in `Worker.create` above points at it. Temporal keeps workflow code apart from the rest of the worker: at startup it bundles that one module with everything it imports and loads the bundle into a V8 sandbox, and every export of the module becomes a workflow type the worker can run. This package ships its workflow ready to use; your module only has to export it:

```ts
export { runWorkflow } from '@workflowbuilder/temporal/workflow';
```

That one line is required. The bundler sees only the module you hand it, so a plugin cannot register a workflow on your behalf, and the client starts the workflow by that export name.

Node activities default to 10 minutes and 2 attempts. To give some node types their own timeout and retry cap, build the workflow instead of re-exporting it, and hand the same map to the plugin:

```ts
// node-activity-profiles.ts
import { DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from '@workflowbuilder/temporal';
// workflows.ts
import { createRunWorkflow } from '@workflowbuilder/temporal/workflow';

export const nodeActivityProfiles: NodeActivityProfiles = {
  // A thinking-mode model needs room; keep an explicit retry cap.
  'my-product/ai-agent': { startToCloseTimeout: '30m', retry: { maximumAttempts: 3 } },
  // Change one field and inherit the rest.
  'my-product/decision': { ...DEFAULT_NODE_ACTIVITY_PROFILE, startToCloseTimeout: '30s' },
};

// worker.ts
const plugin = new WorkflowBuilderPlugin({ executors, store, nodeActivityProfiles });

export const runWorkflow = createRunWorkflow({ nodeActivityProfiles });
```

Keep the export named `runWorkflow`: that is the name the client starts. Entries are whole profiles, so a node type either has a complete entry or gets `DEFAULT_NODE_ACTIVITY_PROFILE`. A `startToCloseTimeout` is a number followed by `ms`, `s`, `m`, `h` or `d`.

**Use one constant on both sides.** The plugin validates the map at `Worker.create`, so a bad profile fails the deploy. `createRunWorkflow` alone validates only on the first workflow activation, and a map handed to the plugin but not to `createRunWorkflow` gives you a green deploy with every node on the default profile.

### Failures and retries

A node activity gets the attempts its profile allows. An executor can settle the question itself:

```ts
import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflowbuilder/temporal';

// A rejected API key, a 400, a template that cannot render: another attempt changes nothing.
throw new PermanentNodeExecutionError('auth_rejected', 'API key rejected');
// A timeout, a 429, a 5xx: worth another attempt, within the profile's cap.
throw new TransientNodeExecutionError('rate_limited', 'Rate limited');
```

A permanent failure is not retried at all. A transient one retries up to the profile's `maximumAttempts`, and so does anything thrown unclassified. The error code and the attempt it died on land in the `node_failed` event.

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
const { error } = await engine.resolveNode(executionId, 'approval-1', { output: 'approved', nextPort: 'approved' });
```

The engine and the worker default to the same task queue (`workflow-execution`). Override it in both places together, or leave both alone.

## What the plugin does not do

Three things are deliberately yours, and knowing which they are makes debugging much easier:

- **It does not bundle the workflow.** See `workflows.ts` above.
- **It does not open the connection.** Connection, TLS and credentials stay in your code.
- **It does not own storage.** Persistence arrives through the `store` port, so any database works.

## Entry points

| Import                               | Use it for                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `@workflowbuilder/temporal`          | Worker side: the plugin, `createActivities`, the `RUN_WORKFLOW_NAME` and `RESOLVE_NODE_UPDATE_NAME` constants, types |
| `@workflowbuilder/temporal/client`   | Starting and cancelling runs, delivering verdicts                                                                    |
| `@workflowbuilder/temporal/workflow` | Sandbox-safe: `runWorkflow` to re-export, event emitter, profiles, the `resolveNode` update                          |

`/workflow` is the only entry point that is safe inside Temporal's V8 sandbox. The split also means a backend that only starts runs never pulls in the worker package and its native binary.

Also exported, for the pieces the quick start does not touch: `DEFAULT_NODE_ACTIVITY_PROFILE` and `DEFAULT_DATABASE_ACTIVITY_PROFILE` are what every activity gets unless a profile says otherwise; `assertNodeActivityProfiles` and `resolveNodeActivityOptions` check a profile map in worker setup, before the sandbox would; `PermanentNodeExecutionError` and `TransientNodeExecutionError` (both extending `NodeExecutionError`) let an executor say whether a failure deserves another attempt. The rules behind profiles are in [activity-profiles.md](https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/activity-profiles.md); how node labels reach Event History is in [event-history-labels.md](https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/event-history-labels.md).

## Pausing a run for a human

An executor that returns `{ waiting: true }` instead of a completion parks the run at that node. Nothing polls and no timer is set: the workflow stops producing commands, so a parked run costs nothing while it waits and survives worker restarts, redeploys and weeks of idleness. The wave containing the waiting node holds until every node in it has resolved; the rest of that wave keeps running.

```ts
const plugin = new WorkflowBuilderPlugin({
  executors: {
    'my-app/approval': () => ({ waiting: true }),
    // ...the rest of your executors
  },
  store,
});
```

While parked, the store sees a `node_waiting` event for the node and the run status moves to `waiting`. It returns to `running` once the last waiting node has resolved, so two nodes parked at once produce a single `waiting`/`running` transition. Both are written after the workflow has started accepting a verdict for that node, so acting on either is never too early.

The verdict arrives as a Workflow Update, `resolveNodeUpdate`:

```ts
import { executionWorkflowId } from '@workflowbuilder/temporal';
import { resolveNodeUpdate } from '@workflowbuilder/temporal/workflow';

const handle = client.workflow.getHandle(executionWorkflowId(executionId));
await handle.executeUpdate(resolveNodeUpdate, {
  args: [{ nodeId: 'approval-1', resolution: { output: { decision: 'approved' }, nextPort: 'approved' } }],
});
```

The `resolution` is the completion the node finishes with, exactly as if its executor had returned it: `output` becomes the node's output for everything downstream, and `nextPort` routes the graph. This package passes it through untouched. What a verdict contains, and who may deliver one, is your application's contract.

A resolution may also carry `outcome: { value, resolvedBy }`, the run's business result. The runner then treats an unrouted `nextPort` as a deliberate end, closes the run `completed`, records `{ outcome: { value, resolvedBy, nodeId } }` on `execution_completed` and passes `{ value, resolvedBy }` as the fourth argument of `updateExecutionStatus`; a store that ignores it loses the result. This package reads neither string. The rule in full is in the execution-core README under "Outcomes".

Because this is an Update and not a signal, the caller gets a synchronous answer, and the update is validated before it is accepted, so a rejected verdict leaves no trace in the run. The rejections, each an `ApplicationFailure` with a stable type: a malformed envelope is `verdict_malformed` (the envelope is an object carrying at most `output`, `nextPort` and `outcome`; `nextPort` must not be the reserved `errorRoute`; `outcome`, when present, is an object with exactly `value` and `resolvedBy`, both non-empty strings; and a missing `output` is read as `undefined`, which is what the default JSON payload converter turns `output: undefined` into), a node id that is not in the graph is `verdict_for_unknown_node`, a node that is not currently waiting is `node_not_waiting` (final: it has not parked, or its wait was cancelled), and a second verdict for the same node is `verdict_already_delivered`: the first one wins. A verdict for a run that has already closed fails at the server. Through `engine.resolveNode` every one of these comes back as `{ error: { code, message } }` instead of a throw, plus `run_not_found` for a closed run and `delivery_timeout` when no worker accepted the update within `resolveTimeoutMs` (default 10 s). A timed-out update may still reach the next worker, so a resend can answer `verdict_already_delivered`; exactly one lands. Cancelling a parked run closes it as `cancelled`, with `execution_cancelled` following the node's `node_waiting` and no `node_failed` recorded for the node that was waiting.

### Wave-barrier limitations (deliberate)

Graph traversal is wave-based with a barrier, and the pause does not restructure it. Three consequences are documented limitations, not bugs:

- successors of an independent parallel branch wait for the wave that contains a waiting node, even when their own inputs are ready;
- a waiting node in a deeper wave becomes visible only once the earlier waves resolve;
- a fatal failure in the same wave as a parked node cannot close the run until the verdict arrives, so a person can approve a run that then immediately fails.

Lifting the barrier later is an additive engine change: same events, same update, same statuses.

## Versioning and replay

This package carries two contracts, not one. The API is the ordinary semver surface. The second is replay compatibility: a workflow can sit in Event History for days, and a new version of this package has to be able to replay a history that an older version recorded.

| Release | API                      | Replay                                                              |
| ------- | ------------------------ | ------------------------------------------------------------------- |
| patch   | no changes               | histories from older versions replay unchanged                      |
| minor   | additions only           | histories still replay; new behaviour sits behind `patched()`       |
| major   | breaking changes allowed | replay may break, and the release notes say to drain in-flight runs |

Pre-1.0 the API surface may still move between minor versions. It is reviewed deliberately, not incidentally. The replay column has no such exception: a 0.x minor still replays histories recorded by earlier 0.x versions.

Two notes on the moving parts underneath: Temporal's plugin API is marked experimental upstream, and this package is deliberately a thin layer over `SimplePlugin` to keep that exposure small. The package ships as ESM only.

## License

Apache-2.0

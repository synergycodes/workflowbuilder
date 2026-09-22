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

Also exported, for the pieces the quick start does not touch: `DEFAULT_NODE_ACTIVITY_PROFILE` and `DEFAULT_DATABASE_ACTIVITY_PROFILE` are what every activity gets unless a profile says otherwise; `assertNodeActivityProfiles` and `resolveNodeActivityOptions` check a profile map in worker setup, before the sandbox would; `PermanentNodeExecutionError` and `TransientNodeExecutionError` (both extending `NodeExecutionError`) let an executor say whether a failure deserves another attempt. The rules behind profiles are in [activity-profiles.md](https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/activity-profiles.md); how node labels reach Event History is in [event-history-labels.md](https://github.com/synergycodes/workflowbuilder/blob/main/packages/temporal/event-history-labels.md).

## What Event History records

Temporal writes every argument you give it into Event History. Replay reads that record back, so nothing can change it later. The record lives while the run is open, then for the namespace's retention period after the run closes.

This package hands Temporal:

- The workflow input. It carries the whole graph definition, so every node's `config` is in the record before the first node runs.
- The arguments and the return value of every `executeNode` call. The arguments are the node, `variables`, `global`, `triggerPayload`, and the output of every node that finished before the current wave started.
- The arguments of every `updateStatus` call, including the `errorMessage` of a failed run.
- The payload of every `emitEvent` call `runGraph` makes. This is the only one that `execution-core` redacts first.
- The Temporal Summary of every labelled node activity, copied from `node.label`.
- Every failure: the error's message, type and stack, and the run's own final failure. A classified error also carries a `NodeErrorEnvelope` in `details` and the original error in `cause`.

### Secrets

**Keep secret values out of everything this package hands Temporal. Only `emitEvent` payloads are redacted; nothing stops a secret anywhere else from reaching Event History.**

Anyone who can open the Temporal UI can read the record. On Temporal Cloud, Temporal stores it on its own infrastructure.

**You cannot edit a leaked key out of Event History. You can only delete the whole run, and that leaves whatever your own store holds for it: the event payloads `emitEvent` wrote, the trigger payload, the definition. So rotate the key.**

[`execution-core`](../execution-core/README.md#recorded-step-inputs-and-payload-redaction) redacts inside the workflow, before it calls the `emitEvent` activity, and matches by key name. Everything else in the list above stays as written.

Three rules follow:

- **Keep secrets in the worker's own environment.** The reference worker keeps its model key and its search key there.
- **One secret for the whole installation: capture it at worker start.** An executor is a closure, so capture the value when you build `executors`, as the reference worker does with its keys.
- **A secret that differs per run or per tenant: capture a resolver, not a value.** A closure built at worker start sees the same value on every call. The executor's second argument is the `ExecutionContext`; key the lookup on `context.executionId` or on a non-secret discriminator your backend puts in `variables`, and resolve the secret inside the executor. Temporal never records what the executor does in its own body. It does record the return value and, for any error, the message, type, stack and `cause`, so keep the secret out of all of them, and out of the node's `config`, which travels in the workflow input.

A Payload Codec encrypts payloads before they leave the process. A codec is one part of a data converter, so pass `dataConverter: { payloadCodecs: [codec] }` to `Worker.create`, and the same object to the `Client` you hand `TemporalWorkflowEngine`; nothing in this package stands in the way. The plugin ships no codec of its own (follow-up: temporal-payload-codec).

### Payload size and the history budget

Two [server defaults](https://docs.temporal.io/references/dynamic-configuration) bound a run. You can raise or lower them on a self-hosted deployment. On [Temporal Cloud](https://docs.temporal.io/cloud/limits) they are fixed.

| What                                                                  | Warns at | Fails at | Dynamic config        |
| --------------------------------------------------------------------- | -------- | -------- | --------------------- |
| One payload set: an activity's input or result, or the workflow input | 512 KB   | 2 MB     | `limit.blobSize.*`    |
| Event History size, per run                                           | 10 MB    | 50 MB    | `limit.historySize.*` |

A third default, `limit.historyCount.*`, caps a run at 10,240 events (warn) and 51,200 (fail). A chain costs about 18 events per node, so the size limits bind first unless node outputs are tiny. The continue-as-new suggestion Temporal raises at 4 MB or 4,096 events is inert here: this package never calls `continueAsNew`.

Which limit you reach first depends on the size of your node outputs. `runGraph` gives every node the output of every node that finished before the current wave started, not only the output of its direct predecessors. So node 2 receives one output, node 3 receives two, and so on.

Take a chain of N nodes each returning S bytes. The run writes about N(N+3)S ÷ 2 bytes into history. N(N−1)S ÷ 2 of that is `executeNode` arguments. The remaining 2NS is each output written twice more, once as the activity's result and once in its `node_completed` payload. Above about 45 KB per output the arguments reach 2 MB before history reaches 50 MB. Below that size, history goes first. Every call also carries `triggerPayload`, `variables`, `global` and the node itself regardless of S, and a large trigger payload is the usual reason that matters.

At 100 KB per output, the `executeNode` arguments pass 512 KB at node 7. History passes 10 MB at node 13. The arguments pass 2 MB at node 22.

What an oversize payload does depends on which one it is. The worker checks each outbound payload before sending it. Over the warn threshold it logs `[TMPRL1103]` at `WARN` and sends anyway. Over the error limit it logs at `ERROR` and fails the task instead. The error limit comes from the namespace. The warn threshold does not. It is the worker's own 512 KiB default, and only `NativeConnectionOptions.payloadLimits` moves it, not `limit.blobSize.warn`. That option is experimental, so expect it to change.

- **`executeNode` arguments over the limit** fail the Workflow Task. Temporal retries that task forever, so the run hangs, and a deploy does not free it: on replay the arguments are rebuilt from node outputs already in history, so no executor change can shrink them. Terminate the run. On a self-hosted deployment, raising `limit.blobSize.error` on the server and restarting the worker is the alternative.
- **An `executeNode` return value over the limit** fails the activity attempt. The retry policy re-runs the node, the output is oversize again, and the node fails once the profile's attempts are spent. From there `errorPolicy` decides, as for any other node failure.

`disablePayloadErrorLimit` on the worker skips the check and leaves the limit to the server.

A large model answer is the usual oversize return value. Keep the bulk out of the node's output. Store it where your application already stores blobs, and return only an identifier for it, an S3 key or a row id. The next node then fetches the data itself. This is the claim-check pattern. This package ships no blob store and no fetch helper, so your executor has to do both sides.

## Versioning and replay

This package carries two contracts, not one. The API is the ordinary semver surface. The second is replay compatibility: a workflow can sit in Event History for days, and a new version of this package has to be able to replay a history that an older version recorded.

| Release | API                      | Replay                                                              |
| ------- | ------------------------ | ------------------------------------------------------------------- |
| patch   | no changes               | histories from older versions replay unchanged                      |
| minor   | additions only           | histories still replay; new behaviour sits behind `patched()`       |
| major   | breaking changes allowed | replay may break, and the release notes say to drain in-flight runs |

Pre-1.0 the API surface may still move between minor versions. It is reviewed deliberately, not incidentally. The replay column has no such exception: a 0.x minor still replays histories recorded by earlier 0.x versions.

Two notes on the moving parts underneath: Temporal's plugin API is marked experimental upstream, and this package is deliberately a thin layer over `SimplePlugin` to keep that exposure small. The package ships as ESM only.

## Testing

[`TESTING.md`](TESTING.md) covers what is tested, what is not, and how CI gates it.

## License

Apache-2.0

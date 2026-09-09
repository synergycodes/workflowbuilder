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

That one line is required. The TypeScript SDK builds the workflow bundle from a single module, so a plugin cannot register a workflow on your behalf. Re-exporting it from your own workflows module is how the bundle picks it up.

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

A `startToCloseTimeout` is a number followed by `ms`, `s`, `m`, `h` or `d`. Decimals are fine (`'1.5h'`). It has to fit a protobuf `Duration`, so anything under one nanosecond or over `'3652500d'` is out. Zero, negative values and exponent notation are rejected even though TypeScript's template literal type admits them: `'0s'` type-checks, and Temporal treats a zero timeout as unset and refuses to schedule the activity.

This grammar is narrower than Temporal's own, which parses durations with the `ms` package and also takes `'30 minutes'` or `'1 week'`. One documented form is deliberate. If you think in the wider grammar, convert before the value reaches this map.

Declare the map once and hand the same constant to both sides. The workflow needs it in order to schedule activities; the plugin needs it only to check it early.

```ts
// node-activity-profiles.ts
import { DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from '@workflowbuilder/temporal';

export const nodeActivityProfiles: NodeActivityProfiles = {
  'my-product/ai-agent': { startToCloseTimeout: '30m', retry: { maximumAttempts: 3 } },
  'my-product/decision': { ...DEFAULT_NODE_ACTIVITY_PROFILE, startToCloseTimeout: '30s' },
};

// worker.ts
const plugin = new WorkflowBuilderPlugin({ executors, store, nodeActivityProfiles });

// workflows.ts
export const runWorkflow = createRunWorkflow({ nodeActivityProfiles });
```

**The two sides are not linked for you.** The workflow bundle is compiled from your own `workflows.ts`, so handing a map to the plugin does not put it in the bundle, and handing it to `createRunWorkflow` does not show it to the worker. Import one constant in both places or they will drift. Nothing detects the drift: the plugin validates the map it is given and checks its keys against your executors, but it cannot see whether that same map reached `createRunWorkflow`. A map passed to the plugin alone gives you a green deploy and every node on the default profile.

Passing it to the plugin is what makes a bad profile fail `Worker.create`, which is to say the deploy. `createRunWorkflow` validates as well, but that call runs inside Temporal's sandbox on the **first activation of a workflow**, not at `Worker.create` and not at bundling time. On its own it means a worker that starts green and then wedges every run in a workflow-task retry loop, visible in your worker log and in Temporal UI but with no `execution_failed` and no status change in your own database. If you would rather not hand the map to the plugin, call `assertNodeActivityProfiles` from `@workflowbuilder/temporal/workflow` in your worker setup instead. It is the same check.

The plugin also warns when a profile is keyed by a node type with no executor registered on that worker, which is the one configuration mistake the sandbox genuinely cannot see. It warns rather than throws, because a single workflow bundle may serve several workers that each register a subset of the node types. Pass your own `logger` in the plugin options to get that warning as a structured record; without one it goes to `console.warn`, which a worker shipping JSON to a sink is not watching.

Profile **keys** cannot be validated inside the workflow: it runs in Temporal's sandbox and has no access to your executor registry, which lives on the worker. A misspelled key is therefore silent there, and the node type you meant to configure keeps the default profile. A node that really is of the misspelled type is a different story: it gets the custom profile and then fails outright, because no executor is registered for it either. So when a profile appears to have no effect, start with that warning in your worker log.

### What the profile check covers

It rejects a map whose entry is missing or `undefined`, whose `startToCloseTimeout` falls outside what a protobuf `Duration` carries, whose `retry.maximumAttempts` is not a positive integer that fits Temporal's `int32` field, or that carries any key beyond those two.

Unknown keys throw rather than being quietly dropped. Only those two fields are forwarded to `proxyActivities`, so a third would do nothing, and a map built from configuration gets no excess-property check from TypeScript to catch it at the keyboard.

Both bounds guard the same failure, where a value becomes its own opposite on the wire. Under one nanosecond a duration rounds to zero, which the server reads as unset and refuses, leaving the workflow task in a retry loop with nothing written to your database. A retry cap of `4294967296` arrives as `0`, which Temporal reads as unlimited.

What it does not do is measure a value against Temporal's wire format, so a pathological duration string or an oversized serialized summary still fails when the activity is scheduled rather than at startup. That is deliberate: profiles come from a typed constant in your own source, reviewed like any other code, not from user input. If you generate them from configuration instead, validate that configuration at its own boundary.

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

Node activities get 10 minutes and 2 attempts, because a node may call a model. The two database activities get 30 seconds and 5 attempts, because they are fast idempotent writes. Both are exported (`DEFAULT_NODE_ACTIVITY_PROFILE`, `DEFAULT_DATABASE_ACTIVITY_PROFILE`) and pinned by a test, so an upgrade cannot silently change how long your nodes are allowed to run. Both are frozen, and readonly in the types: to tune one, spread it into an entry of your own map rather than assigning to it.

Per-node-type overrides go through `createRunWorkflow` (see `workflows.ts` above). Two functions are exported from `/workflow` to check a map without reading it back out of Event History: `assertNodeActivityProfiles` for the shape alone, and `resolveNodeActivityOptions` for what a given node ends up scheduled with. The second validates the map itself before resolving, so either one is a complete check on its own. `createRunWorkflow` validates and freezes the map once, and the workflow then resolves against that snapshot without re-checking it per node.

## Node labels in Event History

Each node activity is scheduled with the node's authored label as its Temporal Summary, so Event History lists the names from your diagram instead of a column of identical `executeNode` rows. A node without a label simply gets no summary, where Temporal falls back to showing the activity type.

The label is normalised on the way in: runs of whitespace collapse to single spaces, because Temporal renders the Summary as single-line markdown. It is then clamped to 300 UTF-8 bytes, since the Summary is copied into every `ActivityTaskScheduled` event and an unbounded one grows Event History for the whole life of the run. The clamp counts bytes and cuts on code-point boundaries, so a label in a non-Latin script gets a shorter summary than an ASCII one of the same length, and an emoji is never cut in half.

The budget applies to the **raw string**, which is not the same thing the server's 400-byte `limit.userMetadataSummarySize` measures. That cap counts the serialized payload, so JSON escaping is inside it: a quote or a backslash costs two bytes, and a control character six. A custom payload converter or codec shifts it again, and an encrypting one grows it. So no byte figure here is a promise about what the server will accept, and clamping by serialized size is deliberately out of scope (follow-up: temporal-profile-wire-validation). The cap is unenforced today; the reason to keep summaries short is Event History, not the cap.

Filling in `node.label` belongs to whatever builds the `WorkflowExecutionInput`, not to this package. If your own layer never sets it you get the identical `executeNode` rows back, and nothing here can tell the difference.

The attempt count is an upper bound rather than a promise. An executor that throws `PermanentNodeExecutionError` — for a rejected API key, say — is not retried at all: the activity adapter marks the failure non-retryable, which Temporal honours regardless of the profile. `TransientNodeExecutionError` says the opposite, that another attempt is worth making, but it does not raise the limit; the profile still caps it. Anything thrown unclassified retries exactly as it always has. Both classes are re-exported from this package, and a classified failure also records its error code and the attempt it died on in the `node_failed` event — see [`execution-core`](../execution-core/README.md#transient-vs-permanent-failures) for when to throw which.

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

**You cannot edit a leaked key out of Event History. You can only delete the whole run. So rotate the key.**

[`execution-core`](../execution-core/README.md#recorded-step-inputs-and-payload-redaction) redacts inside the workflow, before it calls the `emitEvent` activity, and matches by key name. Everything else in the list above stays as written.

Two rules follow:

- **Keep secrets in the worker's own environment.** The reference worker keeps its model key and its search key there.
- **If a secret must differ per run or per tenant, read it inside the executor.** Temporal never records what the executor does in its own body. It does record the return value and the message of any error, so keep the secret out of both, and out of the node's `config`, which travels in the workflow input. An executor is a closure: capture the secret in `executors` at worker start, as the reference worker does with its keys.

A Payload Codec encrypts payloads before they leave the process. Pass one as `dataConverter` to `Worker.create` and to the `Client` you hand `TemporalWorkflowEngine`; nothing in this package stands in the way. The plugin ships no codec of its own (follow-up: temporal-payload-codec).

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

- **`executeNode` arguments over the limit** fail the Workflow Task. Temporal retries that task, so the run hangs until you deploy a fix.
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

Pre-1.0 the API surface may still move between minor versions. It is reviewed deliberately, not incidentally.

Two notes on the moving parts underneath: Temporal's plugin API is marked experimental upstream, and this package is deliberately a thin layer over `SimplePlugin` to keep that exposure small. The package ships as ESM only.

## License

Apache-2.0

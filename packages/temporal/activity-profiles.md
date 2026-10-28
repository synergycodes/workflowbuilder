# Activity profiles

How long a node activity may run and how many attempts it gets, per node type. The package README shows the one-line `workflows.ts` and a minimal `createRunWorkflow`; this file has the rules behind them and the ways they go wrong.

## Defaults

Node activities get 10 minutes and 2 attempts, because a node may call a model. The two database activities get 30 seconds and 5 attempts, because they are fast idempotent writes. Both are exported (`DEFAULT_NODE_ACTIVITY_PROFILE`, `DEFAULT_DATABASE_ACTIVITY_PROFILE`) and pinned by a test, so an upgrade cannot silently change how long your nodes are allowed to run. Both are frozen, and readonly in the types: to tune one, spread it into an entry of your own map rather than assigning to it.

Per-node-type overrides go through `createRunWorkflow` (below). Two functions are exported from `/workflow` to check a map without reading it back out of Event History: `assertNodeActivityProfiles` for the shape alone, and `resolveNodeActivityOptions` for what a given node ends up scheduled with. The second validates the map itself before resolving, so either one is a complete check on its own. `createRunWorkflow` validates and freezes the map once, and the workflow then resolves against that snapshot without re-checking it per node.

## Per-node-type profiles

The TypeScript SDK builds the workflow bundle from a single module, so anything configurable about the workflow is configured in your `workflows.ts` rather than on the plugin. To give some node types their own timeout and retry cap, build the workflow instead of re-exporting it:

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

## Duration grammar

A `startToCloseTimeout` is a number followed by `ms`, `s`, `m`, `h` or `d`. Decimals are fine (`'1.5h'`). It has to fit a protobuf `Duration`, so anything under one nanosecond or over `'3652500d'` is out. Zero, negative values and exponent notation are rejected even though TypeScript's template literal type admits them: `'0s'` type-checks, and Temporal treats a zero timeout as unset and refuses to schedule the activity.

This grammar is narrower than Temporal's own, which parses durations with the `ms` package and also takes `'30 minutes'` or `'1 week'`. One documented form is deliberate. If you think in the wider grammar, convert before the value reaches this map.

## One constant, both sides

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

## What the profile check covers

It rejects a map whose entry is missing or `undefined`, whose `startToCloseTimeout` falls outside what a protobuf `Duration` carries, whose `retry.maximumAttempts` is not a positive integer that fits Temporal's `int32` field, or that carries any key beyond those two.

Unknown keys throw rather than being quietly dropped. Only those two fields are forwarded to `proxyActivities`, so a third would do nothing, and a map built from configuration gets no excess-property check from TypeScript to catch it at the keyboard.

Both bounds guard the same failure, where a value becomes its own opposite on the wire. Under one nanosecond a duration rounds to zero, which the server reads as unset and refuses, leaving the workflow task in a retry loop with nothing written to your database. A retry cap of `4294967296` arrives as `0`, which Temporal reads as unlimited.

What it does not do is measure a value against Temporal's wire format, so a pathological duration string or an oversized serialized summary still fails when the activity is scheduled rather than at startup. That is deliberate: profiles come from a typed constant in your own source, reviewed like any other code, not from user input. If you generate them from configuration instead, validate that configuration at its own boundary.

## Retries and error classes

The attempt count is an upper bound rather than a promise. An executor that throws `PermanentNodeExecutionError` (for a rejected API key, say) is not retried at all: the activity adapter marks the failure non-retryable, which Temporal honours regardless of the profile. `TransientNodeExecutionError` says the opposite, that another attempt is worth making, but it does not raise the limit; the profile still caps it. Anything thrown unclassified retries exactly as it always has. Both classes are re-exported from this package, and a classified failure also records its error code and the attempt it died on in the `node_failed` event. See [`execution-core`](../execution-core/README.md#transient-vs-permanent-failures) for when to throw which.

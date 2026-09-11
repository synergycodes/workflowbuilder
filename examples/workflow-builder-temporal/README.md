# Workflow Builder on Temporal

Run a workflow drawn in the Workflow Builder editor as a durable Temporal Workflow Execution: every node becomes an Activity, retries and history come from Temporal, and the canvas shows each node's status live.

This sample wires the [`@workflowbuilder/temporal`](https://www.npmjs.com/package/@workflowbuilder/temporal) plugin into a Temporal Worker and executes a three-node diagram authored in the [Workflow Builder](https://www.workflowbuilder.io) editor. One node fails on its first attempt on purpose, so the retry you see in Event History is a real one. An optional editor lets you change the diagram and watch nodes light up while Temporal runs them.

![Nodes lighting up in the editor while Temporal runs the flow](docs/editor-run.png)

## What runs where

```
editor (browser, optional)  --POST canvas snapshot-->  worker + bridge (npm start)  -->  Temporal (temporal server start-dev)
        ^                                                     |  executors: trigger, action, condition
        +----------- SSE: node events ------------------------+  store: prints events, streams them to the editor

npm run workflow  ---- reads src/diagram.json, starts one run, waits for it ---->  Temporal
```

The diagram:

```
New request (trigger)  -->  Send email (action, fails once on purpose)  -->  Needs review? (condition: amount > 100)
```

## Prerequisites

- Node.js 22 (20 works).
- The Temporal CLI: install it from <https://docs.temporal.io/cli#install> (`brew install temporal` on macOS).
- Nothing else. No Docker, no database, no API keys.

## Run it

Fetch just this folder:

```bash
npx degit synergycodes/workflowbuilder/examples/workflow-builder-temporal workflow-builder-temporal
cd workflow-builder-temporal
```

Terminal 1, a local Temporal server:

```bash
temporal server start-dev
```

Terminal 2, the Worker:

```bash
npm install
npm start
```

Expected, between Temporal's own startup lines:

```
worker polling task queue "workflow-execution" on 127.0.0.1:7233
bridge listening on http://127.0.0.1:3210
```

Terminal 3, one run of the diagram:

```bash
npm run workflow
```

Expected in terminal 3:

```
started execution-74ef6654-b27c-4585-81fd-212ed1a3720a
watch it: http://localhost:8233/namespaces/default/workflows/execution-74ef6654-b27c-4585-81fd-212ed1a3720a
run completed
```

Expected in terminal 2, the store printing what the workflow emitted. Temporal's own `Activity failed` warning for the first attempt appears between lines 4 and 5:

```
[74ef6654] # 1 execution_started {"workflowId":"workflow-builder-temporal-sample"}
[74ef6654] # 2 node_started (trigger-1) {"config":{"description":"Workflow entry point","status":"active"},"visibleNodeIds":[]}
[74ef6654] # 3 node_completed (trigger-1) {"output":{"amount":250,"customer":"Ada"}}
[74ef6654] # 4 node_started (action-1) {"config":{"description":"Notify the customer","status":"active","message":"Thanks for reaching out - we are on it!"},"visibleNodeIds":["trigger-1"]}
[74ef6654] # 5 node_completed (action-1) {"output":{"delivered":true,"attempt":2,"message":"Thanks for reaching out - we are on it!"}}
[74ef6654] # 6 node_started (condition-1) {"config":{"description":"Checks the amount","status":"active","condition":"amount > 100"},"visibleNodeIds":["trigger-1","action-1"]}
[74ef6654] # 7 node_completed (condition-1) {"output":{"expression":"amount > 100","matched":true}}
[74ef6654] # 8 execution_completed
[74ef6654] status completed
```

## What you will see in Temporal UI

Open the `watch it:` link. The run is one Workflow Execution. Each node is an Activity named after its label, because the plugin sets the node's label as the activity summary. Click `Send email`: attempt 1 failed with `mail_server_busy`, attempt 2 succeeded. The retry is Temporal's, governed by the plugin's default node profile (10 minutes, 2 attempts), not by anything in this sample.

![The Send email activity with two attempts](docs/temporal-ui-retry.png)

## Optional: run it from the canvas

Keep terminals 1 and 2 running. The editor posts the canvas to the worker's bridge and reads events back from it.

```bash
cd editor
npm install
npm run dev
```

Open the printed URL (Vite defaults to <http://localhost:5173>). The editor opens with the same diagram. Click **Run on Temporal** in the top bar: each node shows a spinner while its Activity runs, then a check. `Send email` spins through both attempts. The **Temporal UI** link opens the run.

Then change things. Edit the message, set the condition to `amount > 1000` and see `matched: false` in the worker terminal, add a second Action from the palette. The editor keeps your edits in `localStorage`; reload to keep them, clear site data to get the original diagram back.

## How it works

Five places carry the whole integration. Each has a comment where the reason is not visible in the code.

1. [`src/workflows.ts`](src/workflows.ts) re-exports `runWorkflow`. Temporal bundles workflow code from one module, so a plugin cannot register its workflow for you; the re-export is how the bundle picks it up.
2. [`src/worker.ts`](src/worker.ts) creates `WorkflowBuilderPlugin({ executors, store })` and hands it to `Worker.create`. The plugin contributes the activities that execute a graph. Connection, task queue, and shutdown stay yours.
3. [`src/executors.ts`](src/executors.ts) is one function per node type. Executors run inside the plugin's `executeNode` Activity, which is why `action` can read Temporal's attempt number and why throwing `TransientNodeExecutionError` gets it retried while `PermanentNodeExecutionError` does not.
4. [`src/store.ts`](src/store.ts) implements the store port: where events and status changes land. Here they go to the terminal and to the editor's event stream. In your application they go to a database; the port is the same.
5. [`src/to-definition.ts`](src/to-definition.ts) turns the editor's snapshot into the plugin's `WorkflowDefinition`. The plugin knows nothing about React Flow; this file is the only glue.

[`src/client.ts`](src/client.ts) starts a run through `TemporalWorkflowEngine` from `@workflowbuilder/temporal/client` and then waits on an ordinary Temporal workflow handle. [`src/bridge.ts`](src/bridge.ts) does the same for the editor over HTTP and streams the store's events back as Server-Sent Events.

## Make it yours

- **Add a node type.** Add a palette item under `editor/src/nodes/` and register it in `editor/src/nodes/index.ts`; add a variant to `SampleNode` in `src/nodes.ts` and an executor in `src/executors.ts`. TypeScript refuses to compile until the executor exists.
- **Tune retries per node type.** Replace the re-export in `src/workflows.ts` with `createRunWorkflow({ nodeActivityProfiles })` and pass the same map to the plugin. The plugin README explains why both sides need it.
- **Point at Temporal Cloud.** `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, and `TEMPORAL_UI_ORIGIN` are read in `src/config.ts`. TLS and API keys go on the two connections in `src/worker.ts` and `src/client.ts`.
- **Persist events.** Replace `createRunStore()` with anything that implements `ExecutionStore`.

## Learn more

- [`@workflowbuilder/temporal` on npm](https://www.npmjs.com/package/@workflowbuilder/temporal): profiles, node labels in Event History, versioning and replay.
- [Workflow Builder documentation](https://www.workflowbuilder.io/docs/overview/)
- [Temporal TypeScript SDK](https://docs.temporal.io/develop/typescript)

## License

Apache-2.0. See [LICENSE](LICENSE).

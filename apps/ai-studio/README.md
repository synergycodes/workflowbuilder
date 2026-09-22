# AI Studio

Reference frontend for the Workflow Builder AI Studio product. Consumes `@workflowbuilder/sdk` like an external user would, composing app-shell UI directly via JSX and using the plugin API only for per-node markers + translations.

> ⚠️ Local development only. Depends on the reference backend, which has no auth/authz. See [apps/backend/README.md](../backend/README.md).

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo).

## What this is

A complete, runnable AI workflow product built on top of the Workflow Builder SDK. It demonstrates:

- Connecting to the reference Hono backend over HTTP + Server-Sent Events
- AI Studio–specific node types (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`, `ai-studio/human-decision`, `ai-studio/visualize`)
- A run that stops for a person: `ai-studio/human-decision` parks the run (its executor returns `{ waiting: true }`) until `POST /api/executions/:id/decision` delivers a decision; the "Refund Review" template shows the loop. The node renders through its own template, keyed by the palette type in `nodeTemplates`, with one output handle per action of its `decisionRequest` that carries a port.
- A rejection ends the run as a result, not a dead end: the run closes `completed`, the log panel names the outcome and who settled it, and the reject handle needs no edge. The node's output carries `resolvedBy` beside the other decision fields. The run's pill stays `completed` on purpose, a rejection being a result and not a failure; whether the panel marks it visually is for the design pass.
- Live execution UI: Play/Stop controls, log panel, per-node status markers (including a waiting marker), edge highlighting, node-detail overlay
- A run survives a reload or a closed tab: `use-execution-store.ts` persists the execution id, stream URL, run status and the log preference in `localStorage` (`ai-studio:execution`), `useBackendExecution` reopens the stream on mount while the run may still be alive, and the stream's snapshot rebuilds markers and log. A run that has already finished is stored as idle on purpose, so a reload after one starts on an idle canvas. Stop is offered for every status in which the server may still hold the run, `disconnected` included; a `404` naming the run as unknown forgets it, a `200` or a `409` reopens the stream, and any other answer — or none at all — leaves the run where it is and offers Reset as the way out. Reset clears the client only: it never cancels the run, and once Stop has been asked for the button's tooltip says so

This is a sibling to `apps/demo`, not a layer over it. They share the SDK; nothing else.

## Compared to apps/demo

|              | `apps/demo`                 | `apps/ai-studio`                                         |
| ------------ | --------------------------- | -------------------------------------------------------- |
| Purpose      | Minimal embed showcase      | Full AI workflow product                                 |
| Backend      | None (pure SPA)             | Required (Hono + Temporal)                               |
| Plugin model | Plugins decorate the editor | Direct JSX composition; one slim plugin for node markers |
| Dev port     | 4200                        | 4201                                                     |

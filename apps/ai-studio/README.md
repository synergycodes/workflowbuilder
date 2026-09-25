# AI Studio

Reference frontend for the Workflow Builder AI Studio product. Consumes `@workflowbuilder/sdk` like an external user would, composing app-shell UI directly via JSX and using the plugin API only for per-node markers + translations.

> ⚠️ Local development only. Depends on the reference backend, which has no auth/authz. See [apps/backend/README.md](../backend/README.md).

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo).

## What this is

A complete, runnable AI workflow product built on top of the Workflow Builder SDK. It demonstrates:

- Connecting to the reference Hono backend over HTTP + Server-Sent Events
- AI Studio–specific node types (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`, `ai-studio/human-decision`, `ai-studio/visualize`)
- A run that stops for a person: `ai-studio/human-decision` parks the run (its executor returns `{ waiting: true }`) until `POST /api/executions/:id/decision` delivers a decision; the "Refund Review" template shows the loop. The node renders through its own template, keyed by the palette type in `nodeTemplates`, with one output handle per action of its `decisionRequest` that carries a port.
- The author picks what the decider sees: the panel lists the fields the proposal source declares under `properties.outputSchema` (the named `proposalSourceNodeId`, else the single predecessor) and sets each to Hidden, Read-only, Editable or Editable, required. The picks are `decisionRequest.schema` itself, in the contract's format: a field it leaves out is Hidden, so the canvas, the Run payload and the decider's form read one schema. The control lives in `src/components/human-decision/decision-fields/`; it is locked from Run until Reset and steps aside while the node waits.
- A rejection ends the run as a result, not a dead end: the run closes `completed`, the log panel names the outcome and who settled it, and the reject handle needs no edge. The node's output carries `resolvedBy` beside the other decision fields. The run's pill stays `completed` on purpose, a rejection being a result and not a failure; whether the panel marks it visually is for the design pass.
- The person decides in the node's properties sidebar: the editor's own form over `decisionRequest.schema`, filled from the proposal source's output, with read-only fields disabled and only the changed editable fields sent as `edits`. From the moment the backend starts a run until Reset the canvas is read-only, so the form reads the graph the run executes; `use-run-locks-canvas.ts` lists the exceptions.
- An AI Agent node that answers as structured fields: the Response format dropdown sets `properties.outputSchema` to a preset JSON Schema, the worker asks the model for that shape (see [apps/execution-worker/README.md](../execution-worker/README.md#ai-agent-structured-output)), and in Refund Review the draft's fields fill the decision form, and the reply the person approves, edits included, is what the customer gets. Plain text stays the default and returns `{ response }`. The draft's `internalReasoning` stays off the form because the decision request's schema leaves it out, and out of the confirmation only because the second agent's prompt says so; nothing downstream enforces that. A node switched to a structured format has no `response`, so a downstream `{{ nodes.<id>.response }}` fails the run as `template_unresolved`, while the editor still suggests `response` for every AI Agent.
- Live execution UI: Run/Stop controls, log panel, per-node status markers (including a waiting marker), edge highlighting, node-detail overlay
- A run survives a reload or a closed tab: its id, stream URL and status live in `localStorage` under `ai-studio:execution`, and on mount `useBackendExecution` reopens the stream while the run may still be alive, so the snapshot rebuilds markers and log. A run the client saw finish is stored as idle; one that finished while the tab was closed shows once more, then goes idle. [Stopping and resetting a run](#stopping-and-resetting-a-run) covers Stop, Reset and the limits.

This is a sibling to `apps/demo`, not a layer over it. They share the SDK; nothing else.

## Compared to apps/demo

|              | `apps/demo`                 | `apps/ai-studio`                                         |
| ------------ | --------------------------- | -------------------------------------------------------- |
| Purpose      | Minimal embed showcase      | Full AI workflow product                                 |
| Backend      | None (pure SPA)             | Required (Hono + Temporal)                               |
| Plugin model | Plugins decorate the editor | Direct JSX composition; one slim plugin for node markers |
| Dev port     | 4200                        | 4201                                                     |

## Stopping and resetting a run

Stop sends `DELETE /api/executions/:id`. The controls offer it for every status in which the server may still hold the run: `pending`, `running`, `waiting`, `cancelling` and `disconnected`. They offer Reset once the run has ended, and beside Stop as soon as Stop is clicked, because a cancel the server accepts can still never finish. Until the run ends, that Reset is labelled "Reset without cancelling: the run may still be running on the server". The controls stay on screen while a run exists, even after its trigger node is deleted, and show Run only when the canvas has a start node. From the click on Run until the backend answers, Stop shows disabled and Reset stays hidden, so a second start cannot follow.

| Answer to Stop                         | What the client does                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `200` or `409`                         | Reopens the stream unless the run already ended over the old one. The snapshot shows where the run stands. |
| `404` with `code: execution_not_found` | Forgets the run.                                                                                           |
| Anything else, or no answer            | Keeps the run. Reset stays available.                                                                      |

The client keeps the Stop request in memory only. After a reload, one more Stop brings Reset back, and a run the server reports as `cancelling` brings it back without one.

Reset clears the client only. It closes the stream and forgets the run, and never cancels the run on the server.

`disconnected` means the client lost the stream, not that the run ended, and a reload tries the stream again. A refused stream shows `disconnected` at once, because the browser never retries one. That covers any non-200 answer and a wrong MIME type, a proxy's `502` included. After a network error the browser retries on its own, and the client gives up with `disconnected` after five failed retries.

Known limits:

- Tabs share one entry. Each tab writes its own run and the log panel's collapsed state over it on every change: Run, Reset, a log toggle, a live event. A reload then shows whichever run was written last, or none, and a live run replaced this way keeps going on the server.
- A remembered run the server no longer knows, after a fresh database for example, shows `disconnected` and Stop on every visit until the server answers a Stop with `404` and the client forgets the run. The client does not check the id on mount.
- Storage is best effort. A failed write, with storage full or disabled, leaves the live run alone, and a reload then finds whatever was written last.

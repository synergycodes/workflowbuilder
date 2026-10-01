# AI Studio

Reference frontend for the Workflow Builder AI Studio product. Consumes `@workflowbuilder/sdk` like an external user would, composing app-shell UI directly via JSX and using the plugin API only for per-node markers + translations, and to hide the properties panel's Delete button.

> ⚠️ Local development only. Depends on the reference backend, which has no auth/authz. See [apps/backend/README.md](../backend/README.md).

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo).

## What this is

A complete, runnable AI workflow product built on top of the Workflow Builder SDK. It demonstrates:

- Connecting to the reference Hono backend over HTTP + Server-Sent Events
- AI Studio–specific node types (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`, `ai-studio/human-decision`, `ai-studio/visualize`)
- A run that stops for a person: `ai-studio/human-decision` parks the run (its executor returns `{ waiting: true }`) until `POST /api/executions/:id/decision` delivers a decision; the "Refund Review" template shows the loop. The node renders through its own template, keyed by the palette type in `nodeTemplates`, with one output handle per action of its `decisionRequest` that carries a port.
- The author picks what the decider's form shows. The panel lists the fields the proposal source (the named `proposalSourceNodeId`, else the single predecessor) declares under `properties.outputSchema` that the form can show (text, number, yes/no, and nullable text or yes/no; integers, nullable numbers, objects, arrays and keys with a dot or bracket are left out), each at one of four levels: Hidden, Read-only, Editable, or Editable and required. The control lives in `src/components/human-decision/decision-fields/`; from the moment the backend starts a run until Reset it is hidden, so the panel shows only the run (the decision form, then the record).
- The picks are `decisionRequest.schema` itself, in the contract's format, so the canvas, the Run payload and the decider's form read one schema: a field it leaves out is Hidden, and Editable and required drops `null` from a nullable type, so a null the model left holds Approve back. A required field the decider empties holds it back too, because the backend refuses it. A required text field emptied or left with only whitespace shows no error of its own, and nothing on screen says why Approve is disabled. A field the source no longer declares stays in the schema, listed as "not in the source", until the author hides it. A stored field of a type the form cannot show gets no row, and the next pick drops it from the schema, `readOnly` and `required` included. Hidden keeps a field off the form and refuses edits to it; the value stays in the source's output, which the log panel shows and later nodes read.
- A rejection ends the run as a result, not a dead end: the run closes `completed`, the log panel names the outcome and who settled it, and the reject handle needs no edge. The node's output carries `resolvedBy` beside the other decision fields. The run's pill stays `completed` on purpose, a rejection being a result and not a failure; whether the panel marks it visually is for the design pass.
- The person decides in the node's properties sidebar: the editor's own form over `decisionRequest.schema`, filled from the proposal source's output, with read-only fields disabled and only the changed editable fields sent as `edits`. Approve and "Reject…" sit in the panel's footer. The panel shows no Delete button for any selection, deliberately for now; deleting stays on the Delete and Backspace keys. From the moment the backend starts a run until Reset the canvas is read-only, so the form reads the graph the run executes; `use-run-locks-canvas.ts` lists the exceptions. Should undo change the picks under an open form, the form keeps the fields it opened with.
- An AI Agent node that answers as structured fields: the Response format dropdown sets `properties.outputSchema` to a preset JSON Schema, the worker asks the model for that shape (see [apps/execution-worker/README.md](../execution-worker/README.md#ai-agent-structured-output)), and in Refund Review the draft's fields fill the decision form, and the reply the person approves, edits included, is what the customer gets. Plain text stays the default and returns `{ response }`. The draft's `internalReasoning` stays off the form because the decision request's schema leaves it out, and out of the confirmation only because the second agent's prompt says so; nothing downstream enforces that. A node switched to a structured format has no `response`, so a downstream `{{ nodes.<id>.response }}` fails the run as `template_unresolved`, while the editor still suggests `response` for every AI Agent.
- Live execution UI: Run/Stop controls, log panel, per-node status markers, a footer on a waiting decision node with Decide, a snackbar while the run waits for a decision, edge highlighting, node-detail overlay
- Decide selects the waiting node through the SDK's `useSetSelection`, replacing the selection, and moves the focus to its decision form. Neither the footer nor the snackbar shows while the run is `cancelling`, since the backend refuses a decision then, and the snackbar offers no Decide for a node the canvas lacks. A closed snackbar stays closed for that wait until the page reloads.
- A run survives a reload. Run writes the run's id into the URL, so a reload opens that run: its executed graph, read-only, with the stream reopened and the snapshot rebuilding markers and log. A closed tab comes back only through the browser's history, which restores the URL. [Stopping and resetting a run](#stopping-and-resetting-a-run) covers Stop, Reset and the limits.
- A URL opens a stored workflow or a run: `?workflowId=` to edit a workflow, `?executionId=` to watch or replay a run. See [Opening a workflow or a run from the URL](#opening-a-workflow-or-a-run-from-the-url).

This is a sibling to `apps/demo`, not a layer over it. They share the SDK; nothing else.

## Compared to apps/demo

|              | `apps/demo`                 | `apps/ai-studio`                                                                                                       |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Minimal embed showcase      | Full AI workflow product                                                                                               |
| Backend      | None (pure SPA)             | Required (Hono + Temporal)                                                                                             |
| Plugin model | Plugins decorate the editor | Direct JSX composition; slim plugins for node markers, the panel's Delete button and the run view's hidden Save button |
| Dev port     | 4200                        | 4201                                                                                                                   |

## Stopping and resetting a run

Stop sends `DELETE /api/executions/:id`. The controls offer it for every status in which the server may still hold the run: `pending`, `running`, `waiting`, `cancelling` and `disconnected`. They offer Reset once the run has ended, and beside Stop as soon as Stop is clicked, because a cancel the server accepts can still never finish. Until the run ends, that Reset is labelled "Reset without cancelling: the run may still be running on the server". The controls stay on screen while a run exists, even after its trigger node is deleted, and show Run only when the canvas has a start node. From the click on Run until the backend answers, Stop shows disabled and Reset stays hidden, so a second start cannot follow.

| Answer to Stop                         | What the client does                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `200` or `409`                         | Reopens the stream unless the run already ended over the old one. The snapshot shows where the run stands. |
| `404` with `code: execution_not_found` | Forgets the run.                                                                                           |
| Anything else, or no answer            | Keeps the run. Reset stays available.                                                                      |

The client keeps the Stop request in memory only. After a reload, one more Stop brings Reset back, and a run the server reports as `cancelling` brings it back without one.

Reset clears the client only. It closes the stream, forgets the run and removes `executionId` from the URL, and never cancels the run on the server.

`disconnected` means the client lost the stream, not that the run ended, and a reload tries the stream again. A refused stream shows `disconnected` at once, because the browser never retries one. That covers any non-200 answer and a wrong MIME type, a proxy's `502` included. After a network error the browser retries on its own, and the client gives up with `disconnected` after five failed retries.

## Opening a workflow or a run from the URL

The URL is the only record of what the editor shows. Four rules:

1. AI Studio reads the URL once, while the page loads, behind a loading screen. Editing the URL and pressing Enter loads the page again; a URL changed any other way is ignored until the next load.
2. `executionId` wins: the canvas shows the graph the run executed (`GET /api/executions/:id/snapshot`), read-only, live or replayed, named `Run <first 8 characters>`. `workflowId` without a run opens the workflow's draft (its published version when it has no draft, an empty canvas when it has neither) under the workflow's name, and the editor saves into that draft. Neither id opens the local draft in `localStorage`, as before.
3. The app writes the URL in two places. Run adds `executionId` with `history.replaceState` and keeps `workflowId`; Reset removes it and, in a run view, reloads the page, which lands on the workflow when the URL names one and on the local draft otherwise.
4. A URL that cannot be opened shows one screen with the reason and a way out: to the workflow when the URL names one and only the run failed, to the local draft otherwise. The URL stays, so a reload tries again. The same screen catches a diagram that throws while drawing.

So after every action the canvas shows what a reload of the current URL would show.

| URL                           | Canvas                                          | Save                                                                                           | Run                                        |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| no parameter                  | The local draft in `localStorage`               | The editor's Save button and autosave, into `localStorage`                                     | Creates a workflow for every run           |
| `?workflowId=<id>`            | The workflow's draft, under the workflow's name | The editor's Save button, autosave and the save on close, all `PATCH /api/workflows/:id/draft` | Saves the draft, then runs the workflow    |
| `?executionId=<id>`           | The graph the run executed, read-only           | None: the Save button is hidden                                                                | Not offered                                |
| `?workflowId=…&executionId=…` | As `?executionId=`                              | None                                                                                           | Not offered; Reset returns to the workflow |

- Ids are trimmed and lowercased, the form the backend stores and sends back. The stream follows the run's stored id, so any spelling Postgres reads as that uuid goes live. Nothing else is checked in the browser: a malformed id goes to the backend, and its answer ends on the error screen.
- Saving a workflow goes through the SDK's `props` integration: `onDataSave` sends the draft with `keepalive`, so the save on close outlives the page. An autosave, the save on close included, sends nothing when the draft is what the tab last saved, or when nothing was edited since the link opened, so closing a tab that was only looked at writes nothing. The SDK autosaves only when a change comes more than 10 s after its last save, so the latest edits often wait for Save or for the save on close. Browsers refuse a keepalive body of 64 KiB or more, so a larger draft is sent without it and its save on close may not arrive. A failed autosave shows an error snackbar, since the SDK shows nothing for it; a failed Save shows the SDK's own.
- A run view gets the `props` integration with a save callback that is never called, and `plugins/run-view/` hides the editor's Save button, which is also where autosave and the save on close live.
- Notices show in the editor's snackbars (`showSnackbar`); one raised before the editor mounts waits for it. Warnings and errors stay until closed and show once per text, so a failing autosave does not stack copies; a success goes by itself.
- A diagram opened from the URL never touches the local draft.

Known limits:

- Whoever has a run's URL can do what its owner can: read it, including the inputs, prompts and answers; stop it; decide for it. The welcome disclaimer tells visitors so and asks them not to enter personal or confidential data.
- A reload after the run finished still shows it, read-only, until Reset, because the URL still names it.
- The run view is read-only through the run lock only. The app bar's read-only switch lifts it, and edits made then are saved nowhere.
- Autosave and the save on close keep a workflow's edits, so a reload no longer discards them; undo is the only way back.
- Before the first save, only edits the editor tracks count. The decision node's Add branch is not tracked, so a tab whose only edit is a new branch drops it on close unless Save runs first.
- The graph is drawn as stored. A draft saved through the API in a shape the editor cannot draw ends on the error screen; one that draws wrongly shows wrongly.
- Run saves the raw store into the draft, `selected` and `measured` included; autosave writes the clean shape. Nodes of a type this app does not know show without a properties panel.

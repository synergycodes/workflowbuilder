# @workflow-builder/e2e

Browser tests for AI Studio on the full stack: UI -> HTTP/SSE -> backend -> Temporal -> worker. Everything the repo
owns is real; only the LLM is a fake. Playwright, Chromium only.

## Running

```bash
pnpm e2e:db:up     # once: Postgres 16 in Docker, 127.0.0.1:5442, data on tmpfs
pnpm e2e           # starts the stack, runs the tests, stops the stack
pnpm e2e:db:down   # when you are done
```

First time on a machine: `pnpm --filter @workflow-builder/e2e exec playwright install chromium`.

Arguments after `pnpm e2e` go to Playwright: `pnpm e2e approve-refund`, `pnpm e2e --headed`, `pnpm e2e --repeat-each=10`.

The suite uses its own ports and its own database, so it runs next to `pnpm dev:ai-studio`. It is not part of
`pnpm test`.

## What a run starts

Playwright's global setup (`src/stack/global-setup.ts`) starts each piece in this order, waits for its ready signal,
and stops all of it afterwards, also when a step fails.

| #   | Piece     | How                                                                             | Ready when                         |
| --- | --------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Database  | `CREATE DATABASE wb_e2e_<time>_<random>` on the server at `E2E_POSTGRES_URL`    | the statement returns              |
| 2   | Temporal  | `TestWorkflowEnvironment.createLocal()`: an in-memory dev server on a free port | the call returns                   |
| 3   | Fake LLM  | `src/fake-llm/server.ts`, inside the Playwright process                         | it listens                         |
| 4   | Backend   | `pnpm --filter @workflow-builder/backend start:prod`                            | `backend listening`, `/api/health` |
| 5   | Worker    | `pnpm --filter @workflow-builder/execution-worker start:prod`                   | `execution worker started`         |
| 6   | AI Studio | `vite build` into `apps/e2e/dist/ai-studio`, then `vite preview`                | `Local:`, then the page answers    |

The database is dropped in teardown. The backend and the worker get their configuration through the process
environment only: their `.env` files are not read, and `AI_*`, `TEMPORAL_*`, `TAVILY_*`, `TURNSTILE_*`, `RATE_LIMIT_*`
and `VITE_*` variables of your shell are not passed on.

The worker and the backend import `packages/temporal/dist`, and the app uses `packages/ui/dist`. Both are built on
install; after editing those packages run `pnpm build:temporal` or `pnpm build:ui` before `pnpm e2e`.

## Environment

| Variable           | Default                                      | Meaning                                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| `E2E_POSTGRES_URL` | `postgresql://wb:wb@127.0.0.1:5442/postgres` | A server and a role that may create and drop databases       |
| `E2E_BACKEND_PORT` | `3101`                                       | Backend                                                      |
| `E2E_APP_PORT`     | `4301`                                       | AI Studio (`vite preview`)                                   |
| `E2E_LLM_PORT`     | `4311`                                       | Fake LLM                                                     |
| `CI`               | unset                                        | Set: `test.only` fails the run, and the GitHub reporter runs |

A busy port or an unreachable Postgres server stops the run before anything starts, with a message that names the
variable or the command.

## The fake LLM

An OpenAI-compatible server behind `AI_BASE_URL`, for the backend and the worker alike.

- `POST /v1/chat/completions`, non-streaming. The answer is the same for the same request, every time.
- A request with `response_format.json_schema` gets JSON built from the schema (`src/fake-llm/value-from-schema.ts`):
  every declared property, strings as `Fake <property name>`, numbers as `100` (moved into `minimum` / `maximum`),
  booleans as `true`, the first `enum` entry, one array item (or `minItems`), the first non-null branch of a nullable
  type or `anyOf`. Tests import `FAKE_NUMBER` and `fakeString()` instead of repeating these.
- Any other request gets `FAKE_TEXT_REPLY`.
- `GET /__e2e/requests?marker=<text>` returns every request whose body contains the text, in the order received.
- `e2e:delay=<ms>` anywhere in a request holds its answer that long. The trigger input reaches every AI node as
  context, so the directive delays every model call of that run. A held request ends when the client disconnects.

## Adding a test

Copy `tests/approve-refund.spec.ts`. One test is one business case, starts its own run, and shares nothing with
other tests but the stack.

```ts
import { expect, test } from '../src/fixtures';
import { logRow, pickTemplate, runStatus, setTriggerInput, startRun } from '../src/studio';

test('what breaks when this fails', async ({ studio: page, marker, llm, backend }) => {
  await pickTemplate(page, 'Refund Review');
  await setTriggerInput(page, 'trigger-1', `Some input. ${marker}`);
  const executionId = await startRun(page);
  await expect(runStatus(page)).toHaveText('Waiting for decision');
  // ...
});
```

Fixtures (`src/fixtures.ts`):

| Fixture   | What it gives                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `marker`  | A string unique to the test. Put it in the trigger input so `llm` can find this test's requests      |
| `studio`  | The page, with AI Studio open, the welcome dialog acknowledged and no stored draft                   |
| `llm`     | `requests()`: what the fake LLM received for this test's marker, as `{ system, user, schema, body }` |
| `backend` | `execution(id)`: the stored run, `GET /api/executions/:id`                                           |

Helpers (`src/studio.ts`) are plain functions over the page, named after what the user does or sees: `pickTemplate`,
`setTriggerInput`, `runButton`, `startRun`, `runStatus`, `logRow`, `openDecision`, `decisionField`, `decide`,
`reasonDialog`, `canvasNode`, `propertiesPanel`, `executionLog`. Add one when a second test needs the same step.

Canvas gestures, for a test that edits the diagram (`tests/add-gate.spec.ts`):

| Helper               | What the user does                         | How it is driven                                                                                                                                 |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addNodeFromPalette` | Drags a palette item onto the empty canvas | A real mouse drag (`dragTo`) from the item to a point of the canvas pane; Chromium turns it into the HTML5 drag and drop the palette listens for |
| `connectNodes`       | Draws an edge from a port to another node  | A mouse drag from the output handle (`data-handleid`) to the other node's `target` handle                                                        |
| `removeConnection`   | Deletes an edge                            | A click on the middle of the edge's path, Delete, then Delete in the confirmation dialog                                                         |
| `setNodeTitle`       | Renames a node in the properties panel     | Click the node, fill "Node Title...", blur, wait for the node to show the title                                                                  |
| `spotAbove`          | Picks where to drop                        | A point above a node, from its bounding box, read once the canvas has stopped moving                                                             |
| `connection`         | Sees an edge                               | React Flow names an edge "Edge from `<id>` to `<id>`"                                                                                            |

What the editor does that a gesture has to respect:

- Picking a template animates the view into place for about a second. Positions are read after the node is stable.
- Dropping a node onto an edge does not splice it in: delete the old edge and draw two new ones.
- Remove an edge before drawing one that starts at the same port: both run over the same stretch, and the newer one
  takes the click. `removeConnection` asserts that the edge it clicked is the one selected.
- During a run the waiting notice and the Execution log cover the lower half of the canvas, and an edge that passes
  under a node covers the node's Decide button. `openDecisionFromNotice` uses the notice's Decide button, which is
  always reachable; `openDecision` uses the node's own.
- A gate without fields has an empty decision form: the `Decision` group is attached but has no size.

Rules:

- Wait for a state (`toBeVisible`, `toHaveText`, a response), never for time. No `waitForTimeout`, no retries.
- Find elements by role and accessible name. Canvas nodes go by React Flow's `data-id`, log rows by `data-node-id`.
  No `data-testid`, and no product change made for a test.
- Assert a node's state in its Execution log row: the marker on the canvas node is an icon without text.
- Expected values come from the documented behaviour (`apps/ai-studio/README.md`, `apps/backend/README.md`).
- See the test red once before trusting it: weaken the behaviour it protects, watch it fail on its assertion, restore.
- Read the stored run with `expect.poll(() => backend.execution(id))`. The status chip follows the run's last event,
  and the worker stores that event before it writes the row's status, so the row can lag the UI for a moment.

Four places where the app gives no role or name to hold on to, and what the helpers do instead:

- The run's status chip is the element after the "Execution log" toggle (`runStatus`).
- The decision form's field titles are not labels of their controls; `decisionField` matches the two through the
  wrapper they share.
- The reason dialog's textarea is not labelled by its "Rejection reason" title. It is the dialog's only textbox, so a
  test takes it by role inside `reasonDialog` and asserts the title beside it.
- A text field of the properties panel writes to the diagram when it loses focus, a few milliseconds later, and Run
  reads the diagram at the click. `setTriggerInput` blurs the field, and a test then asserts that the trigger's
  log row shows its marker.

## Reading a failure

- The terminal shows the failed assertion. `apps/e2e/test-results/<test>/` holds a screenshot, a page snapshot
  (`error-context.md`) and a trace: `pnpm --filter @workflow-builder/e2e exec playwright show-trace <trace.zip>`.
- `pnpm --filter @workflow-builder/e2e exec playwright show-report` opens the HTML report.
- `apps/e2e/test-results/stack-logs/` has one log per process: `backend.log`, `worker.log`, `ai-studio-build.log`,
  `ai-studio.log`. A stack that did not start names the log to read.
- In CI the `e2e` job of `pr-check.yml` uploads the report and `test-results/` as the `e2e-report` artifact when it
  fails.

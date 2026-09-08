### Title: Decision request as versioned data on a node

### Proposed by: Piotr Błaszczyk

### Date: 07.09.2026 (shape), 08.09.2026 (names)

## Context

A run can park at a node until a person decides. The backend needs to know what a decision at that node looks like: the actions offered, the fields the decider sees and may correct, whose output is judged, how long to wait. Products bring their own vocabulary; the engine has a closed set of things it can do; the backend knows no product's node types.

The shape itself is documented on the type (`packages/types/src/workflow-execution/decision-request.ts`) and enforced by `decisionRequestSchema` in `apps/backend/src/domain/decision/`. This log keeps only what the code cannot say.

## Decision

1. **Data on the node, not a node kind.** The request lives under the reserved key `data.properties.decisionRequest` and is lifted to `BaseNode.decisionRequest`, as `errorPolicy` is. Its presence is the only marker; nothing detects such a node by `type`. A client adding its own node type never has to teach the backend about it.
2. **Name and effect are split.** `name` and `label` are the client's words ("Escalate to finance"); `effect` is the engine's closed set. A new business vocabulary is data, not a code change.
3. **Edit is not an action.** The decider corrects fields and approves. Whether a field may be edited is already said by `readOnly` in the schema; a second switch would be a second source of truth. `resume-with-edits` is therefore derived, never declared.
4. **JSON Schema for the form**, validated for shape only. The SDK already renders and validates JSON Schema, so the decision form comes for free. A real validator arrives with the first consumer that checks edited values `(follow-up: decision-edit-value-validation)`.
5. **Validated on publish and execute, never on draft save.** A draft is legitimately mid-edit; validating it would lose the author's work on every autosave. Both routes go through one `parseSnapshot` helper and the existing `invalid_snapshot` 400, so they cannot drift.
6. **One definition of the proposal source.** `resolveProposalSource` is the only place that says which node's output a decision judges. The pending-decision resource and the rerun loop must call it rather than re-derive the rule.
7. **Read requests through the parser, never from raw JSON.** Only the parsed form carries the defaults (`port`, `reasonRequired`, `maxIterations`). The stored snapshot stays raw.
8. **Three names for the lifecycle.** `DecisionRequest` is what the node asks. `SubmittedDecision` is what the decider sends, still unchecked. `Decision` is what validation accepts and what will later be stored and audited. The field is not called `decision` because it holds the question, not the answer, and not `decisionContract` because that reads as configuration rather than as a request to a person.
9. **Results carry `error?: undefined`, not an `ok` flag.** `{ value; error?: undefined } | { value?: undefined; error }` reads as plain error handling and the compiler still forbids both-set and neither-set. The flag only repeated what the presence of `error` says.
10. **Vocabulary.** A node carrying a request is a node; no separate noun names it. The rerun effect is named for what it does, `rerun-source`, never for what the source is. Action names in examples (`approve`, `reject`, `ask-again`) are the client's and await a sync with design.

11. **An own `__proto__` key anywhere in a snapshot is refused before parsing.** `JSON.parse` makes it an ordinary key, and zod's loose objects copy unknown keys with a plain assignment, which for that key swaps the output's prototype: everything under it then reads back as validated, and the mapper would copy an inherited request into a real field on the way to the engine. `workflowSnapshotSchema`, the one boundary raw JSON crosses, is wrapped in a preprocess that rejects the key at its path with the usual `invalid_snapshot` 400.

## Rejected

- Detecting the node by its type string: the backend would have to learn every product's vocabulary.
- A home-grown field list instead of JSON Schema: a second standard to render and validate.
- An `ignore` verb: a disguised "abandon the run".
- Defaulting `deadline.policy` to `reject`: a timer that rejects is audit-relevant and must be written down, not implied.
- Exporting the duration pattern from the Temporal plugin: a published API widened for one regex; duplicated with a pointer instead `(follow-up: shared-duration-format)`.

## Known gaps

- A workflow with a `null` draft still publishes `null`, unvalidated, as it did before. Changing that is its own decision.
- A draft may store an own `__proto__` key; it goes nowhere but the database, and publish and execute refuse it. Rejecting it at save time was judged not worth touching the draft route.
- The submission validator returns the first refusal, not a list.
- The snapshot schema does not check that edge endpoints exist, so an explicit source with a dangling edge passes. This predates the change.

## Open points

Taken conservatively; confirm or change when the decision endpoint lands.

- A whitespace-only `reason` counts as missing when `reasonRequired` is set, like a blank comment.
- "Emptied" for a required field means `undefined`, `null` or a whitespace-only string; empty arrays and objects are value validation.
- Edits on a non-`resume` submission are checked but do not change the effect; refusing them with a dedicated code is the recommended alternative.

## Not in this change

Further request fields (condition, four-eyes, several decisions), identity and `x-pii` masking, the decision endpoint, the pending-decision resource, the rerun loop, the deadline timer, and authoring the request in the editor `(follow-up: decision-request-properties-ui)`.

## Status

Accepted

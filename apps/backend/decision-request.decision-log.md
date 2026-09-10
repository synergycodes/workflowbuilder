### Title: Decision request as versioned data on a node

### Proposed by: Piotr Błaszczyk

### Date: 07.09.2026 (shape), 08.09.2026 (names), 10.09.2026 (endpoint)

## Context

A run can park at a node until a person decides. The backend needs to know what a decision at that node looks like: the actions offered, the fields the decider sees and may correct, whose output is judged, how long to wait. Products bring their own vocabulary; the engine has a closed set of things it can do; the backend knows no product's node types.

The shape itself is documented on the type (`packages/types/src/workflow-execution/decision-request.ts`) and enforced by `decisionRequestSchema` in `apps/backend/src/domain/decision/`. This log keeps only what the code cannot say. A complete example, the refund story from the design workshop, is the `workedExample()` fixture in `decision-request-schema.test.ts`.

## Decision

1. **Data on the node, not a node kind.** The request lives under the reserved key `data.properties.decisionRequest` and is lifted to `BaseNode.decisionRequest`, as `errorPolicy` is. Its presence is the only marker; nothing detects such a node by `type`. Present or absent, never `null`: a `null` value is refused, so an editor that clears the request must remove the key. A client adding its own node type never has to teach the backend about it.
2. **Name and effect are split.** `name` and `label` are the client's words ("Escalate to finance"); `effect` is the engine's closed set. A new business vocabulary is data, not a code change.
3. **Edit is not an action.** The decider corrects fields and approves. Whether a field may be edited is already said by `readOnly` in the schema; a second switch would be a second source of truth. `resume-with-edits` is therefore derived, never declared.
4. **JSON Schema for the form**, validated for shape only. The SDK already renders and validates JSON Schema, so the decision form comes for free. A real validator arrives with the first consumer that checks edited values `(follow-up: decision-edit-value-validation)`.
5. **Validated on publish and execute, never on draft save.** A draft is legitimately mid-edit; validating it would lose the author's work on every autosave. Both routes go through one `parseSnapshot` helper and the existing `invalid_snapshot` 400, so they cannot drift.
6. **One definition of the proposal source.** `resolveProposalSource` is the only place that says which node's output a decision judges. The pending-decision resource and the rerun loop must call it rather than re-derive the rule.
7. **Read requests through the parser, never from raw JSON.** Only the parsed form carries the defaults (`port`, `reasonRequired`, `maxIterations`). The stored snapshot stays raw.
8. **Three names for the lifecycle.** `DecisionRequest` is what the node asks. `SubmittedDecision` is what the decider sends, still unchecked. `Decision` is what validation accepts and what is recorded on the node's completion and audited; it names the chosen action and carries the effect, edits, reason and comment. The matched `DecisionAction` is returned beside it for routing, never inside it, so the port and label live once, on the request. The shape of a submission is parsed with `submittedDecisionSchema` at the endpoint; `validateSubmittedDecision` assumes it and checks only the rules. The field is not called `decision` because it holds the question, not the answer, and not `decisionContract` because that reads as configuration rather than as a request to a person.
9. **Results carry `error?: undefined`, not an `ok` flag.** `{ value; error?: undefined } | { value?: undefined; error }` reads as plain error handling and the compiler still forbids both-set and neither-set. The flag only repeated what the presence of `error` says.
10. **Vocabulary.** A node carrying a request is a node; no separate noun names it. The rerun effect is named for what it does, `rerun-source`, never for what the source is. Action names in examples (`approve`, `reject`, `ask-again`) are the client's and await a sync with design.

11. **An own `__proto__` key anywhere in a snapshot is refused before parsing.** `JSON.parse` makes it an ordinary key, and zod's loose objects copy unknown keys with a plain assignment, which for that key swaps the output's prototype: everything under it then reads back as validated, and the mapper would copy an inherited request into a real field on the way to the engine. `workflowSnapshotSchema`, the one parser that preserves unknown keys (loose objects), is wrapped in a preprocess that rejects the key at its path with the usual `invalid_snapshot` 400.

## The endpoint (10.09.2026)

What the endpoint does and answers is in the README. Only the reasons are here.

12. **`nodeId` in the body, not the path**, so the pending-decision resource addresses the same node the same way. The route owns the body shape; `validateSubmittedDecision` judges only the rules, the workflow's validator only engine integrity.
13. **The row is read before authorization** so a port can scope by it; a deny therefore wins over 404 and reveals no id.
14. **Only terminal and `cancelling` runs are refused by status.** The status write is best-effort, so a parked run may read `pending`; the engine is the arbiter.
15. **`attempt` is the node's `node_waiting` count.** The engine has no attempt yet; when the rerun loop re-parks a node, the count follows with no change here.
16. **A second submission is always 409 `decision_already_made`.** The backend stores nothing about a decision, so it cannot tell a repeat from a contradiction; a byte-identical replay needs a caller key `(follow-up: decision-idempotency-key)`. The Temporal update id stays random: a deterministic one would hand a second decider the first one's outcome.
17. **`rerun-source` is 501** until the engine can re-run a source; the LLM budget guard and rate limit move there with the verb `(follow-up: decision-rerun-source)`.
18. **`node_not_waiting` is final** because the runner registers the wait before announcing it. **`delivery_timeout` is 503 with a hedged message** because an update nobody accepted is not durable, yet the server may still hand it to the next worker.

## Rejected

- Detecting the node by its type string: the backend would have to learn every product's vocabulary.
- A home-grown field list instead of JSON Schema: a second standard to render and validate.
- An `ignore` verb: a disguised "abandon the run".
- Defaulting `deadline.policy` to `reject`: a timer that rejects is audit-relevant and must be written down, not implied.
- Recording the whole action object on the decision: the port and label would then live twice, on the request and in every completion, with two sources of truth about where a verdict routes.
- Exporting the duration pattern from the Temporal plugin: a published API widened for one regex; duplicated with a pointer instead `(follow-up: shared-duration-format)`.
- Persisting the first submission only to turn one 409 into a 200.
- Requiring `executions.status === 'waiting'`: it would lock the route to a best-effort write.
- Retrying `node_not_waiting`: the race was fixed at its root, in the runner's order of registering and announcing.

## Known gaps

- A workflow with a `null` draft still publishes `null`, unvalidated, as it did before. Changing that is its own decision.
- A draft may store an own `__proto__` key; it goes nowhere but the database, and publish and execute refuse it. Rejecting it at save time was judged not worth touching the draft route.
- The submission validator returns the first refusal, not a list.
- The snapshot schema does not check that edge endpoints exist, so an explicit source with a dangling edge passes. This predates the change.
- Node ids are not checked for uniqueness either; with a duplicate, the graph rules see the first node of that id. Also pre-existing `(follow-up: snapshot-node-id-uniqueness)`.
- A reject whose port has no edge ends the run `incomplete`. The terminal-outcome work closes this; the seam is `toNodeResolution`.
- A decision records nothing about who decided.
- The route re-parses the stored snapshot with today's `workflowSnapshotSchema`, and a run can wait for days across deploys. A schema tightened in between makes every parked run whose snapshot no longer parses undecidable: the route answers 500 until the snapshot is migrated or the rule relaxed.

## Open points, closed 10.09.2026

A whitespace-only `reason` counts as missing, and "emptied" means `undefined`, `null` or whitespace: both kept. Edits on a non-`resume` action are now refused with `edits_not_allowed`, before the field rules; dropping them silently was the worse failure.

## Not in this change

Further request fields (condition, four-eyes, several decisions), identity and `x-pii` masking, the pending-decision resource, the rerun loop, the deadline timer, and authoring the request in the editor `(follow-up: decision-request-properties-ui)`.

## Status

Accepted

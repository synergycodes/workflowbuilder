### Title: Decision request as versioned data on a node

### Proposed by: Piotr Błaszczyk

### Date: 07.09.2026 (shape), 08.09.2026 (names), 10.09.2026 (endpoint), 17.09.2026 (ports), 21.09.2026 (outcome), 29.09.2026 (failure policy, edit shape), 01.10.2026 (several resume actions)

## Context

A run can park at a node until a person decides. The backend needs to know what a decision at that node looks like: the actions offered, the fields the decider sees and may correct, whose output is judged, how long to wait. Products bring their own vocabulary; the engine has a closed set of things it can do; the backend knows no product's node types.

The shape itself is documented on the type (`packages/types/src/workflow-execution/decision-request.ts`) and enforced by `decisionRequestSchema` in `apps/backend/src/domain/decision/`. This log keeps only what the code cannot say. A complete example, the refund story from the design workshop, is the `workedExample()` fixture in `decision-request-schema.test.ts`.

## Decision

1. **Data on the node, not a node kind.** The request lives under the reserved key `data.properties.decisionRequest` and is lifted to `BaseNode.decisionRequest`, as `errorPolicy` is. Its presence is the only marker; nothing detects such a node by `type`. Present or absent, never `null`: a `null` value is refused, so an editor that clears the request must remove the key. A client adding its own node type never has to teach the backend about it.
2. **Name and effect are split.** `name` and `label` are the client's words ("Escalate to finance"); `effect` is the engine's closed set. A new business vocabulary is data, not a code change.
3. **Edit is not an action.** The decider corrects fields and approves. Whether a field may be edited is already said by `readOnly` in the schema; a second switch would be a second source of truth. `resume-with-edits` is therefore derived, never declared.
4. **JSON Schema for the form**, validated for shape only. The SDK already renders and validates JSON Schema, so the decision form comes for free. A real validator arrives with the first consumer that checks edited values `(follow-up: decision-edit-value-validation)`. Shape only means: an object with a `properties` map, `required` naming declared fields, and `readOnly`, `x-pii` and `type` well-typed where present. `type` is optional, as JSON Schema makes it and as JsonForms renders without it. Every other keyword passes through unread.
5. **Validated on publish and execute, never on draft save.** A draft is legitimately mid-edit; validating it would lose the author's work on every autosave. Both routes go through one `parseSnapshot` helper and the existing `invalid_snapshot` 400, so they cannot drift. Each domain issue in `details` carries `domainCode` and `params` beside zod's `code` and the English `message`, so a client keys on the identifier and the wording stays free to change.
6. **One definition of the proposal source.** `resolveProposalSource` is the only place that says which node's output a decision judges. The pending-decision resource and the rerun loop must call it rather than re-derive the rule. Publishing refuses a request whose source does not resolve: a published decision with nothing to judge is not what the author meant, and with no predecessor at all the node is an orphan the runner fails anyway. Only the rule that the source must not carry its own request stays tied to `rerun-source`, the one effect that re-runs it. A resolved source can still yield no proposal at decision time, when that branch was skipped, so the pending-decision resource keeps its no-proposal path.
7. **Read requests through the parser, never from raw JSON.** Only the parsed form carries the defaults (`reasonRequired`, `maxIterations`). The stored snapshot stays raw.
8. **Three names for the lifecycle.** `DecisionRequest` is what the node asks. `SubmittedDecision` is what the decider sends, still unchecked. `Decision` is what validation accepts and what is recorded on the node's completion and audited; it names the chosen action and carries the effect, edits, reason and comment. The matched `DecisionAction` is returned beside it for routing, never inside it, so the port and label live once, on the request. The shape of a submission is parsed with `submittedDecisionSchema` at the endpoint; `validateSubmittedDecision` assumes it and checks only the rules. The field is not called `decision` because it holds the question, not the answer, and not `decisionContract` because that reads as configuration rather than as a request to a person.
9. **Results carry `error?: undefined`, not an `ok` flag.** `{ value; error?: undefined } | { value?: undefined; error }` reads as plain error handling and the compiler still forbids both-set and neither-set. The flag only repeated what the presence of `error` says.
10. **Vocabulary.** A node carrying a request is a node; no separate noun names it. The rerun effect is named for what it does, `rerun-source`, never for what the source is. Action names in examples (`approve`, `reject`, `ask-again`) are the client's and await a sync with design.

11. **An own `__proto__` key anywhere in a snapshot is refused before parsing.** `JSON.parse` makes it an ordinary key, and zod's loose objects copy unknown keys with a plain assignment, which for that key swaps the output's prototype: everything under it then reads back as validated, and the mapper would copy an inherited request into a real field on the way to the engine. Both parsers that preserve unknown keys are wrapped in a preprocess that rejects the key at its path: `workflowSnapshotSchema`, which answers the usual `invalid_snapshot` 400, and `decisionRequestSchema`, which guards itself so a caller parsing raw JSON with it cannot inherit a request no schema checked. `z.record` is immune by construction but cannot type known keys beside unknown ones, and it protects only its own level, so it is no substitute here.

## The endpoint (10.09.2026)

What the endpoint does and answers is in the README. Only the reasons are here.

12. **`nodeId` in the body, not the path**, so the pending-decision resource addresses the same node the same way. The route owns the body shape; `validateSubmittedDecision` judges only the rules, the workflow's validator only engine integrity.
13. **The row is read before authorization** so a port can scope by it; a deny therefore wins over 404 and reveals no id.
14. **Only terminal and `cancelling` runs are refused by status.** The status write is best-effort, so a parked run may read `pending`; the engine is the arbiter.
15. **`attempt` is the node's `node_waiting` count.** The engine has no attempt yet, so the check is not atomic with delivery; it holds only while a node parks at most once. The rerun loop has to carry the wait instance into the engine `(follow-up: decision-attempt-in-engine)`.
16. **A second submission is always 409 `decision_already_made`.** The backend stores nothing about a decision, so it cannot tell a repeat from a contradiction; a byte-identical replay needs a caller key `(follow-up: decision-idempotency-key)`. The Temporal update id stays random: a deterministic one would hand a second decider the first one's outcome.
17. **`rerun-source` is 501** until the engine can re-run a source; the LLM budget guard and rate limit move there with the verb `(follow-up: decision-rerun-source)`.
18. **`node_not_waiting` is final** because the runner registers the wait before announcing it. **`delivery_timeout` is 503 with a hedged message** because an update nobody accepted is not durable, yet the server may still hand it to the next worker.

## Explicit ports (17.09.2026)

19. **A port is never defaulted.** It is the id of an output handle on one canvas, so no value chosen without that canvas can be right, as with `deadline.policy`. The former defaults `approved` and `rejected` let a request publish with no handle to draw an edge from, and the run ended `incomplete` after the person had decided. `rerun-source` refuses a port from the other side: it does not route, so a handle for it would never fire.
20. **A missing port is a structural issue**, like any other missing key: zod's wording, no domain code. The editor always writes ports, so no interface ever shows it. A structural failure on an action suspends the request-level rules for that round; a domain issue does not. That is why the `rerun-source` port is refused on the field: its issue survives a structural failure beside it, while the request-level rules wait for the action to parse.
21. This was the first tightening of the snapshot schema since the decision route began re-parsing stored snapshots: a run parked with a port-less action, or with a `rerun-source` action carrying a `port` (the loose object used to keep it), would answer 500 until its snapshot was fixed. Accepted, because the feature lived on its branch with no run in flight.

## The outcome of a rejection (21.09.2026)

22. **A rejection is the run's result, not a status.** The run closes `completed`, in our status and in Temporal's, unless another branch ends it `incomplete` or `failed`; `outcome` (`rejected`) and `resolvedBy` (`human`) are nullable open strings on the row, never a fifth terminal status or an enum. `toNodeResolution` declares the outcome on every `reject`, edge or no edge: it says what the run's result was, not that an edge was missing. The runner reads it for presence only, so `rejected` is written here and nowhere else.
23. **A reject port with no edge is a deliberate end.** The runner records no dead end for a completion with an outcome. Publish requires no edge there, a test pins it, and a future rule wiring every handle must keep the exception.
24. **The route stamps the initiator.** The validator judges the body against the request and returns the decision without `resolvedBy`; the route adds `human`, since only it knows who called, and the schema strips an initiator sent in the body. Identity will be stamped at the same line; a deadline that decides writes its own inside the workflow. Note what the initiator reaches: the row's `resolved_by` (readable by any `executions:read` caller), the `execution_completed` payload, and the node's `output`, which downstream nodes read and the node's `outputSchema` declares. None is on the `x-pii` path `(follow-up: decision-initiator-identity-exposure)`.

## Failure policy and edit shape (29.09.2026)

25. **A node that carries a request may not use `errorPolicy: 'continue'`.** The runner absorbs such a failure with no port, which lights every non-error edge: a worker without the node's executor, or a `node_completed` write that fails after an accepted verdict, would run approve and reject together. Publish and execute refuse it with `error_policy_continue`; `fail` and `errorRoute` keep failures visible. The rule lives in the backend, not the runner, because the runner deliberately reads no request. Like decision 21 it tightens a schema the decision route re-parses, so a run parked on such a node would answer 500; accepted, because the feature lives on its branch with no run in flight.
26. **Edits are a patch of the proposal.** The node's output carries them unapplied; whoever reads the decision merges an object field by field and a list element by element. That is why the walk checks only the keys an edit names. A level with `properties` or `items` must therefore keep its shape: `null`, a primitive or the other container could drop the read-only and required children it may hold, so it answers `field_shape_changed`, except `null` where the level's `type` allows it. `null` is the patch's own way to empty a field, and listing it in `type` is the author's consent; any other value would replace the level rather than patch it, even one its `type` lists. Replacement was rejected: it would make every object with a read-only child uneditable as a whole.

## Several resume actions (01.10.2026)

27. **One or more `resume` actions, each its own branch.** A step with two normal outcomes, a review that is complete or incomplete, could not be modelled: the second had to be `reject`, which records `rejected` on the run, and a run keeps the first outcome it declares, so a case put on hold once and processed later read as rejected. `reject` stays at most one, as the only action that records an outcome; a per-action outcome is not in this change. `rerun-source` stays at most one. The route needed nothing: it finds the action by name and routes on that action's port.
28. **Ports are unique across routed actions.** `duplicate_port` on the later action's port replaces the reject-versus-resume rule: with several resume actions there is no one pair to compare, and the port is what routes, so two actions on one handle would be one branch under two labels. A blank port answers `port_empty` alone, as before.
29. **A reason stays optional on `resume`.** `reasonRequired` is honoured on `reject` only. An "incomplete" that must carry a note is a real case, but no client can ask for it yet: the AI Studio form takes a reason only in its reject dialog, and the request is not authored in the panel. A flag that defaults to `false` can be added without changing any stored request, so it waits for the first form that asks `(follow-up: decision-resume-reason-required)`. Since the AI Studio form offers every resume action, it asks for a `comment` on each one past the first as an editor rule only: the contract keeps `comment` optional, and the API accepts a bare resume.
30. **A parked run still decides.** Unlike decisions 21 and 25 this change only loosens the schema, so a run parked under the old rule still decides.

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
- A default port elsewhere: in the template it would be a handle id outside the SDK's shape, kept in two places; in the backend it would teach the backend the editor's handle format.

## Known gaps

- A workflow with a `null` draft still publishes `null`, unvalidated, as it did before. Changing that is its own decision.
- A draft may store an own `__proto__` key; it goes nowhere but the database, and publish and execute refuse it. Rejecting it at save time was judged not worth touching the draft route.
- The submission validator returns the first refusal, not a list.
- It checks editability, presence and shape at every level the form describes inline, following `properties` and `items`. A level reached only through `$ref` or a composition keyword describes nothing there, so an edit into it is refused as an unknown field rather than checked `(follow-up: decision-edit-schema-composition)`.
- The snapshot schema does not check that edge endpoints exist, so an explicit source with a dangling edge passes. This predates the change.
- Node ids are not checked for uniqueness either; with a duplicate, the graph rules see the first node of that id. Also pre-existing `(follow-up: snapshot-node-id-uniqueness)`.
- The route re-parses the stored snapshot with today's `workflowSnapshotSchema`, and a run can wait for days across deploys. A schema tightened in between makes every parked run whose snapshot no longer parses undecidable: the route answers 500 until the snapshot is migrated or the rule relaxed.
- Edits as a patch: a list edit longer than the proposal appends elements that carry none of the read-only fields, since the validator never reads the proposal; a list cannot be shortened, since `[]` patches no element; an object whose `type` does not allow `null` cannot be cleared. AI Studio's `withEdits` only renders a decided record and merges top-level keys, all its form can edit.
- Nothing applies the edits yet: the node's output is the decision alone, so a step after it that reads the source's output sees the proposal without the corrections. Refund Review merges them in its prompt `(follow-up: decision-settled-values)`.
- The `errorPolicy` rule keys on the request, so a node that routes by port without one (a condition node, or a decision node missing its request) still lights every branch on a failure under `continue` `(follow-up: port-routing-continue-broadcast)`.

## Open points, closed 10.09.2026

A whitespace-only `reason` counts as missing, and "emptied" means `undefined`, `null` or whitespace: both kept. Edits on a non-`resume` action are now refused with `edits_not_allowed`, before the field rules; dropping them silently was the worse failure.

## Not in this change

Further request fields (condition, four-eyes, several decisions), identity and `x-pii` masking, the pending-decision resource, the rerun loop, the deadline timer, authoring the request in the editor `(follow-up: decision-request-properties-ui)`, and the node that actually parks. The runner learns no product's vocabulary by design, so a run stops where a node's executor returns a waiting result, never because a field is present. The node type whose executor does only that, and therefore waits without side effects of its own, was its own task; it shipped as `apps/execution-worker/src/executors/human-decision.ts`. Offering every resume action to the decider in AI Studio and a showcase template with two normal outcomes followed as the next two slices of the same work (the AI Studio decision form and the Refund Review template).

## Status

Accepted

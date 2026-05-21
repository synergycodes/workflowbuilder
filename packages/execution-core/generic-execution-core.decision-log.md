### Title: Make execution-core generic over the consumer's node union

### Proposed by: Kuba Skibiński

### Date: 06.05.2026

## Context

`packages/execution-core` was sold as the generic graph-runner mechanism that any workflow product could build on. Reality was narrower: the runner's signatures resolved against a hardcoded AI Studio union.

- `packages/types/src/workflow-execution/execution-model.ts` defined `WorkflowNodeDefinition = TriggerNode | AiAgentNode | DecisionNode` and `ExecutionNodeType = WorkflowNodeDefinition['type']`. The graph runner imported `WorkflowNodeDefinition` directly and used it in every signature (`runGraph`, `ActivityRunnerPort.executeNode`, `NodeExecutorRegistry`). The type system's reading of "this is the runner" was therefore "this is the AI Studio runner".
- `apps/backend/src/domain/mapper/snapshot-schema.ts` validated incoming workflow JSON with a `z.discriminatedUnion('type', […])` over the same three `'ai-studio/*'` literals, plus per-type `properties` shapes (`triggerPropertiesSchema`, `aiAgentPropertiesSchema`, `decisionPropertiesSchema`). The corresponding `from-integration-data.ts` mapper used a `switch (node.data.type)` over the same literals.
- `apps/execution-worker/src/engines/temporal/worker.ts` registered exactly those three executors. Concrete executors and activities (`packages/execution-core/src/executors/{trigger,decision}.ts`, `activities/ai-agent.ts`) lived inside `execution-core` itself, were re-exported from its barrel, and pinned `ai` (the Vercel AI SDK) as a runtime dependency of the package.

Net effect: the engine adapter was swappable per `WorkflowEnginePort`, but the node vocabulary was not. Anyone wanting to ship a different workflow product on this codebase had to fork the core, fork the types package, and rewrite backend mappers. The package's stated purpose ("generic graph-runner mechanism") and its actual surface area diverged.

A separate dead-code observation: `packages/types/src/workflow-execution/node-output-schemas.ts` exported an `executionNodeOutputSchemas` map keyed by `'ai-studio/*'` with zero readers in the repo. It was infrastructure for a feature nobody was using.

## Decision

1. **Type-parameterize execution-core.** Every signature that touches a node is generic in `TNode extends BaseNode`:
   - `runGraph<TNode>(input, runner, events)`
   - `WorkflowExecutionInput<TNode>`, `WorkflowEnginePort<TNode>`, `ActivityRunnerPort<TNode>`
   - `NodeExecutor<TNode>`, `NodeExecutorRegistry<TNode> = { [K in TNode['type']]: NodeExecutor<Extract<TNode, { type: K }>> }`
   - `resolveExecutor<TNode>`
   - All internal helpers (`runNode`, `propagate`, `buildAdjacencyMap`, `computeInDegrees`) and their internal types (`SchedulerState<TNode>`, `AdjacencyEntry<TNode>`, `NodeRunResult<TNode>`)
2. **`BaseNode = { id: string; type: string; config: unknown }`** lives in `@workflow-builder/types/workflow-execution/execution-model` and is the only contract the runner enforces. Consumers narrow `config` via discriminated unions on `type` at registry-instantiation sites.
3. **Concrete AI Studio types and executors move out of shared layers into the worker.** New home: `apps/execution-worker/src/`. Specifically:
   - Concrete node types (`TriggerNode`, `AiAgentNode`, `DecisionNode`, `AiStudioNode` union, configs, `DecisionBranch`, `DecisionBranchCondition`) → `apps/execution-worker/src/domain/ai-studio-nodes.ts`.
   - Concrete executors → `apps/execution-worker/src/executors/{trigger,decision}.ts`, `apps/execution-worker/src/activities/ai-agent.ts`.
   - `decision.test.ts` follows its subject.
   - `execution-core`'s root `index.ts` no longer re-exports any executor.
   - The `ai` dependency moves from `packages/execution-core/package.json` to `apps/execution-worker/package.json`.
   - Dead `packages/types/src/workflow-execution/node-output-schemas.ts` is deleted.
4. **Backend mapper becomes structural.** `snapshot-schema.ts` validates only `{ id, data: { type: string, properties?: Record<string, unknown> } }` for nodes and `{ id, source, target, sourceHandle? }` for edges — no `'ai-studio/*'` literals, no per-type `properties` shape. `from-integration-data.ts` becomes a pass-through: `{ id, type: data.type, config: data.properties ?? {} }`. The backend treats nodes as opaque; the worker narrows `config` against its own union when it dispatches the executor.
5. **Backend ↔ worker meet at the JSON wire format.** Backend instantiates `WorkflowEnginePort<BaseNode>`; worker instantiates `ActivityRunnerPort<AiStudioNode>` and `NodeExecutorRegistry<AiStudioNode>`. Temporal serialises both ends to JSON, which is structurally compatible. Compile-time narrowing is preserved on the worker side, where it pays for itself; the backend stays vocabulary-free.
6. **Unknown node types fail at the worker, not the backend.** The existing `resolveExecutor` already throws `"No executor registered for node type: <x>"` when a type isn't in the registry; the existing graph-runner already converts that into a `node_failed` event with the message in `error.payload.error.message`. The frontend renders that field generically. No new error path was needed.
7. **README rewritten** to reflect the parameterized mechanism. The "Adding a new node executor" example uses an `'<your-product>/<name>'` placeholder and links to `apps/execution-worker` for a concrete reference. The architecture diagram shows `WorkflowEnginePort<TNode>` and `NodeExecutorRegistry<TNode>` as the contract surfaces.

## Alternative Options Considered

- **Leave execution-core as-is, document the coupling in README.** Rejected. The package's stated purpose is to be the generic mechanism. Documenting "actually it's hardcoded to AI Studio" institutionalises the divergence rather than fixing it.
- **Introduce a shared `packages/ai-studio-domain/` for the concrete types, consumed by both backend and worker.** Rejected. Once the backend is structural, only the worker needs the concrete vocabulary. A package boundary for one consumer is overhead with no payoff. Worker colocation also keeps the AI Studio domain next to the runtime that uses it and removes one workspace boundary to maintain.
- **Keep strict per-type Zod validation at the backend, only parameterize runtime types.** Rejected. The strategic frame for this codebase is "default UI plus reference backend = workflow builder starter kit" — strict per-type Zod literally encodes the opposite at the HTTP boundary. Surfacing unknown-type errors as `node_failed` at runtime is the cost of a backend that travels with any workflow product.
- **Put `BaseNode` in `execution-core` rather than `@workflow-builder/types`.** Rejected. `BaseNode` is the wire-format contract used by _both_ the backend and the worker. It belongs at the layer they share, which is `@workflow-builder/types`. Putting it in `execution-core` would force the backend to import from the runner package just for a structural type, which inverts the dependency direction.
- **Default the generic param to a concrete union for ergonomics (`runGraph<TNode = WorkflowNodeDefinition>`).** Rejected. Defaults that name a product hide the coupling problem and create a dangling reference the moment that union moves out of `@workflow-builder/types`. Explicit binding at every callsite (~6 sites total) is small, honest, and survives the move.

## Consequences

- **Pros**
  - **`execution-core` matches its stated purpose.** Pure mechanism, no vocabulary, no AI dependency. Anyone reading the package now sees a generic graph runner; the README isn't lying.
  - **Backend reusable for any workflow product.** A different worker with a different node union plugs into the same backend with no source change. The structural mapper just passes `node.data.properties` through as `config`.
  - **Compile-time narrowing preserved where it pays.** `NodeExecutorRegistry<TNode>` is a mapped type — TypeScript refuses to compile a registry whose key/executor pairs drift, and each executor sees its variant's `config` concretely with no casts. Narrowing didn't get weaker by going generic; it just shifted from "imposed on every consumer" to "available where the consumer wants it".
  - **Smaller `execution-core` footprint.** No `ai` runtime dependency on the package; no concrete executors in the barrel; no `node-output-schemas.ts` cruft. The package is now under 10 source files plus tests, all of them generic in `TNode`.
  - **Clear test posture.** `graph-runner.test.ts` uses a generic `TestNode = BaseNode & { type: 'test/node' }` fixture — the runner's behavior is verified without reference to any product. The decision-executor tests live with the executor in the worker. Backend gains 10 new tests pinning down the structural contract (missing id, missing type, malformed edges, unknown types pass-through, nested config pass-through).

- **Cons**
  - **Error UX for unknown node types shifts from HTTP-time to runtime.** Was: `400 Bad Request` with a Zod error at the backend. Now: `node_failed` event with `"No executor registered for node type: <x>"` once execution starts. Acceptable — the frontend already renders `node_failed.payload.error.message` generically — but the error surface is no longer the HTTP response, and a misconfigured workflow now wastes a Temporal start. The cost is small and only kicks in for malformed input, but it is real.
  - **Misconfigurations within a known type are no longer caught at the HTTP boundary.** The old per-type Zod schemas would reject e.g. an `ai-studio/ai-agent` node missing `systemPrompt`. The new structural schema accepts it; the failure surfaces at executor runtime when the executor tries to read `node.config.systemPrompt`. Trade-off accepted as the price of vocabulary-free backend; if it bites, individual product Zod schemas can be re-introduced at the worker boundary instead.
  - **One localized cast in `resolveExecutor`.** TypeScript can't narrow mapped-type indexing on a union key without help, so `resolveExecutor` does `(registry as unknown as Record<string, NodeExecutor<TNode>>)[node.type]` to bridge the mapped type to a string-indexed map. Comment in source documents why. The runtime is correct and end-to-end inference holds at every other call site.
  - **`<WorkflowBuilder>` children render outside `.workflow-builder-root`.** Pre-existing constraint from the AI Studio split — not new — but worth re-noting because the worker is now the only place that knows AI Studio shapes. If the frontend ever wants per-type behavior at the backend level (e.g. preflight schema check), it will have to send the worker's domain types over the wire or run that check elsewhere.

## Status

Implemented. Verified:

- All package typechecks clean: `@workflow-builder/types`, `@workflow-builder/execution-core`, `@workflow-builder/execution-worker`, `@workflow-builder/backend`, `@workflowbuilder/sdk`.
- All affected test suites pass: 13 graph-runner tests (generic fixtures), 4 decision-executor tests (now in the worker), 10 new backend mapper tests covering structural validation and pass-through.
- `knip` clean across the workspace after pruning the now-unused `@workflow-builder/types` dep from the worker and the unused exports on internal types.

### Follow-ups

The `apps/backend` and `apps/execution-worker` package names (`@workflow-builder/backend`, `@workflow-builder/execution-worker`) still echo the pre-rename layout; aligning them with their folder names lands separately.

Accepted.

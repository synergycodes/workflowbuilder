# agent-harness

## Attribution

Portions of this module are derived from [coleam00/Archon](https://github.com/coleam00/Archon)
(MIT © 2025-2026 Cole Medin). Archon is not depended upon as a library — its provider
abstraction, credential delivery, structured-output handling, and Copilot adapter are
adapted (not copied wholesale) to fit workflowbuilder's Temporal-activity / hexagonal-ports
architecture. See the upstream repository for the original implementation and its `LICENSE`.

Modules derived from Archon (ported incrementally, milestones M1-M9 of the porting plan):

- Provider contract types (`types.ts`, `errors.ts`) — from `packages/providers/src/{types,errors}.ts`
- Provider registry (`registry.ts`) — from `packages/providers/src/registry.ts`
- Credential delivery (`credentials/delivery.ts`, `credentials/catalog.ts`) — from
  `packages/core/src/credentials/{delivery,catalog}.ts`
- Shared execution utilities (`shared/*.ts`) — from `packages/providers/src/shared/*.ts`,
  `packages/workflows/src/utils/idle-timeout.ts`, and `packages/workflows/src/executor-shared.ts`
- Copilot provider adapter (`providers/copilot/*.ts`) — from `community/copilot/*.ts`

## Architecture intent

This directory hosts a worker-local port of Archon's provider abstraction, scoped to a
single functional provider (GitHub Copilot) for v1. It backs the `ai-studio/agent-harness`
node type that delegates a workflow step to an external autonomous coding-agent CLI.
Execution runs inside a Temporal activity (`activities/agent-harness.ts`) rather than
Archon's own DAG executor, since activity code must remain replay-safe and Archon's
execution model (Bun-compiled binary, multi-tenant credential vault) does not map onto
workflowbuilder's architecture.

## Directory structure

| Path                                   | What it does                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `types.ts`                             | Provider contract types: `TokenUsage`/`mergeTokenUsage`, the `MessageChunk` union, `NodeConfig` (the cross-provider parity surface), `ProviderCapabilities`, `IAgentProvider`. |
| `errors.ts`                            | Provider-level error classes.                                                                                                                                                  |
| `registry.ts`                          | Static provider registration (single entry: Copilot) + capability lookup.                                                                                                      |
| `credentials/delivery.ts`              | Turns a resolved credential into `{ env, files? }` for a given vendor; only `github-copilot` is live, `anthropic`/`openai` are kept as commented reference cases.              |
| `credentials/catalog.ts`               | Declares which credential kinds each vendor accepts (trimmed to Copilot).                                                                                                      |
| `shared/binary-resolution.ts`          | Generic "is this an executable file" helper used by provider CLI resolution.                                                                                                   |
| `shared/run-config.ts`                 | Shared run-config validation helpers (`assertKnownRunConfigKeys`, etc.).                                                                                                       |
| `shared/idle-timeout.ts`               | `withIdleTimeout` — wraps an async generator so it aborts if no chunk arrives within a window; `STEP_IDLE_TIMEOUT_MS` default.                                                 |
| `shared/error-classification.ts`       | `classifyError`/`isRateLimitError`/`formatSubprocessFailure` — maps raw error text onto FATAL/TRANSIENT/UNKNOWN.                                                               |
| `providers/copilot/capabilities.ts`    | Copilot's honest capability flags (what it actually supports).                                                                                                                 |
| `providers/copilot/config.ts`          | Lenient (`parseCopilotConfig`) and strict (`parseCopilotRunConfig`) config parsers, effort clamping.                                                                           |
| `providers/copilot/binary-resolver.ts` | Resolves the `copilot` CLI binary: `COPILOT_CLI_PATH` env → config path → `PATH` lookup → throw.                                                                               |
| `providers/copilot/event-bridge.ts`    | Maps the Copilot SDK's native event stream onto the `MessageChunk` union, incl. usage normalization.                                                                           |
| `providers/copilot/provider.ts`        | `IAgentProvider` implementation: env/token resolution, `NodeConfig` → `SessionConfig` translation, `sendQuery`.                                                                |

## Per-file provenance

Every ported file's Archon source (consolidated from the porting plan's `PORTING-MAP.md`):

| workflowbuilder file                   | Archon source                                                    | Fidelity                                                   |
| -------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `types.ts`, `errors.ts`                | `packages/providers/src/{types,errors}.ts`                       | Trimmed / Verbatim                                         |
| `registry.ts`                          | `packages/providers/src/registry.ts`                             | Adapted (static map, not lazy dynamic-import)              |
| `credentials/delivery.ts`              | `packages/core/src/credentials/delivery.ts`                      | Trimmed (Copilot case only, others as commented reference) |
| `credentials/catalog.ts`               | `packages/core/src/credentials/catalog.ts`                       | Trimmed (Copilot only)                                     |
| `shared/binary-resolution.ts`          | `packages/providers/src/shared/binary-resolution.ts`             | Verbatim                                                   |
| `shared/run-config.ts`                 | `packages/providers/src/shared/run-config.ts`                    | Verbatim                                                   |
| `shared/idle-timeout.ts`               | `packages/workflows/src/utils/idle-timeout.ts`                   | Verbatim                                                   |
| `shared/error-classification.ts`       | `packages/workflows/src/executor-shared.ts` (selected functions) | Verbatim                                                   |
| `providers/copilot/capabilities.ts`    | `community/copilot/capabilities.ts`                              | Verbatim                                                   |
| `providers/copilot/config.ts`          | `community/copilot/config.ts`                                    | Verbatim                                                   |
| `providers/copilot/binary-resolver.ts` | `community/copilot/binary-resolver.ts`                           | Trimmed ~205 → ~50 LOC (A4)                                |
| `providers/copilot/event-bridge.ts`    | `community/copilot/event-bridge.ts`                              | Verbatim                                                   |
| `providers/copilot/provider.ts`        | `community/copilot/provider.ts`                                  | Trimmed (A4 import style, OAuth branches dropped)          |
| `../activities/agent-harness.ts`       | `packages/workflows/src/dag-executor.ts` (selected slices)       | Adapted into a Temporal activity (A1/A2/A3)                |

See [`PORTING-MAP.md`](/tmp/opencode/workflowbuilder/PORTING-MAP.md) (outside this repo, plan working directory) for the full line-range breakdown.

## Adaptations from Archon (A1-A8)

This is a port, not a redesign — but a handful of host-architecture mismatches forced
deliberate deviations. These are the _only_ permitted deviations; anything else that
differs from Archon is a defect.

| #   | Archon does                                                            | We do instead                                                                                                          | Why                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Runs the streaming loop inside its own `dag-executor` process          | Runs inside a **Temporal activity** function                                                                           | `runGraph` is sandboxed and replay-deterministic; no I/O may touch it.                                                                                                                    |
| A2  | `withIdleTimeout` is the only liveness mechanism                       | Additionally calls `Context.current().heartbeat()` on an interval, with `heartbeatTimeout` set on the activity profile | Spike-verified: without heartbeating, `handle.cancel()` is silently ignored and the activity runs to completion.                                                                          |
| A3  | `child.kill()` / SDK abort                                             | The Copilot SDK's own `session.abort()`/`client.stop()` — **no manual process-group kill was implemented**             | See "SDK abort supersedes A3" below — empirically the SDK's own abort cleanly kills the underlying process tree; a manual `spawn(detached)+process.kill(-pid)` workaround was not needed. |
| A4  | 6-step binary resolution chain for `bun --compile` binaries            | Plain `node_modules`/`PATH` resolution + a single `COPILOT_CLI_PATH` env override                                      | Worker is a normal Node/Docker process; Archon's chain solves a problem we don't have.                                                                                                    |
| A5  | Encrypted multi-tenant credential vault (DB rows, envelope encryption) | Read credential from worker env config                                                                                 | Single-tenant reference stack. Delivery is ported faithfully; storage is not.                                                                                                             |
| A6  | `cwd` from a `codebases` DB row (`kind: 'repo' \| 'folder'`)           | Workflow-context lookup → scratch temp dir fallback                                                                    | No codebase concept exists yet; Archon's `kind: 'folder'` fallback semantics map directly onto our fallback.                                                                              |
| A7  | Hand-rolled React `NodeInspector.tsx` (tabs, raw `<textarea>`)         | JSONForms `schema.ts` + `uischema.ts`                                                                                  | Host UI is JSONForms-driven; `NodeInspector.tsx` is a field checklist, not code to copy.                                                                                                  |
| A8  | `@archon/*` workspace imports, `Dag*`/`Assistant`/`codebase` naming    | workflowbuilder vocabulary, no Archon identifiers                                                                      | Naming rule — Archon-specific identifiers must not survive into workflowbuilder source.                                                                                                   |

### SDK abort supersedes A3 (evidence-backed deviation)

The plan (A3) called for a manual `spawn(..., { detached: true })` + `process.kill(-pid, 'SIGTERM')`
process-group kill, on the assumption — carried over from Archon, where `copilot` is a Node
wrapper spawning a native grandchild — that killing just the wrapper would orphan a
still-running process.

**This was verified empirically to be unnecessary.** The `@github/copilot-sdk`'s own
`session.abort()`/`client.stop()` cleanly kills the underlying process tree: 4/4 clean kills
during M5's cancellation E2E test, reconfirmed with zero orphans across M9's full-stack E2E
runs (`pgrep -x copilot` empty after every cancellation). The activity therefore wires
Temporal cancellation (`Context.current().cancelled`) straight into the SDK's own abort call
(A2's `abortController.abort()` triggers it) instead of implementing a separate
process-group-kill mechanism. If a future SDK version regresses on this, the process-group-kill
approach described in the plan is the documented fallback.

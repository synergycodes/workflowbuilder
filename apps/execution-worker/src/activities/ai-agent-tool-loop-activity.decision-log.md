### Title: AI agent tool loop runs inside one Temporal Activity

### Proposed by: Dawid Aksamski

### Date: 17.09.2026

## Context

The AI agent node (`ai-agent.ts`, this directory) can call a web search tool. The AI SDK drives that as an agentic loop: the model asks for a search, the worker runs it, the result goes back to the model, and the model either asks again or answers. `generateText` runs the whole cycle internally, capped at four steps (`stopWhen: stepCountIs(MAX_TOOL_STEPS)`).

`@workflowbuilder/temporal` schedules exactly one `executeNode` Activity per node, so the entire loop — every model call and every search — runs inside that one Activity. Temporal's integration guide allows this, but its rule of thumb is "Activities as close to the tool call as possible", and a reviewer will ask why the loop is not split. This log is the answer; the code alone cannot show it.

## Decision

Keep the loop inside the node's single Activity.

- **One Activity per node is the plugin's contract.** `runGraph` reaches the engine through `ActivityRunnerPort.executeNode(node, context)` and nothing finer. What happens inside an executor is the consumer's business; the runner stays engine-agnostic and knows nothing about models or tools.
- **The loop is the AI SDK's, not ours.** Splitting it means re-implementing the call/execute/continue cycle in the workflow: the workflow would hold the conversation state, schedule one Activity per model call and one per tool call, and every intermediate message would be recorded in Event History. That moves provider-specific orchestration into deterministic sandbox code and multiplies history payloads for no gain the node needs today.
- **The only tool is read-only.** Web search (`../tools/web-search.ts`, Tavily) changes nothing in any system we own. Running it twice costs money and time, nothing else.

## What it costs

An Activity retry starts the executor from scratch. Every model call and every search made in the failed attempt runs again; nothing inside the loop is checkpointed. Three caps already bound the bill:

| Cap                  | Where                                    | Effect                                                        |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `MAX_TOOL_STEPS = 4` | `ai-agent.ts`                            | At most four model generations per attempt                    |
| `maxRetries: 0`      | the `generateText` call in `ai-agent.ts` | The AI SDK never retries on its own; Temporal owns retries    |
| `maximumAttempts: 2` | `DEFAULT_NODE_ACTIVITY_PROFILE` (plugin) | At most two attempts per node unless a profile says otherwise |

Worst case per node is therefore eight model generations and eight searches. The loop also has to fit the node profile's `startToCloseTimeout`, 10 minutes by default; a deployment that needs more room declares a profile for `ai-studio/ai-agent` through `createRunWorkflow({ nodeActivityProfiles })` and hands the same map to the plugin.

Failure classification (`provider-error.ts`) applies to the loop as a whole, because `generateText` throws once for the whole cycle: a 401 on the third step is permanent and stops the node; a 429 anywhere in the loop retries the whole node.

## Alternative Options Considered

- **One Activity per tool call, loop driven from the workflow** — rejected for now. The workflow would own the conversation state and a per-node Activity sequence that `runGraph` does not model, and every intermediate message would land in Event History. It is the right shape once a tool has side effects, not before.
- **Child workflow per agent node** — rejected. Same history growth plus a second workflow type to version and replay; nothing here needs its own cancellation or timeout scope.
- **Heartbeat details as a checkpoint inside the Activity** — rejected. Resuming a partial model conversation from `heartbeatDetails` means rebuilding the SDK's loop by hand, which is the first alternative in disguise.

## When to revisit

The decision holds while every tool is read-only. Move a tool into its own Activity, or make it idempotent with a key the workflow supplies, the moment it does anything a second execution must not repeat: sending a message, writing to a store, calling a payment or ticketing API. Activities are at-least-once; a retry of the current design would replay that effect.

## Consequences

- **Pros**
  - The runner stays engine-agnostic and the plugin API needs no notion of tools.
  - Event History holds one Activity per node, labelled with the node's Summary, which is the 1:1 canvas-to-history mapping the integration is built around.
- **Cons**
  - A transient failure late in the loop repeats the earlier steps.
  - The loop's total duration is bounded only by the node profile's timeout.

## Status

Accepted

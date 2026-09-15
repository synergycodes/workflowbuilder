# AI Studio

Reference frontend for the Workflow Builder AI Studio product. Consumes `@workflowbuilder/sdk` like an external user would, composing app-shell UI directly via JSX and using the plugin API only for per-node markers + translations.

> ⚠️ Local development only. Depends on the reference backend, which has no auth/authz. See [apps/backend/README.md](../backend/README.md).

> **Note:** setup is in [root README "Path C. Run the full stack demo"](../../README.md#path-c-run-the-full-stack-demo).

## What this is

A complete, runnable AI workflow product built on top of the Workflow Builder SDK. It demonstrates:

- Connecting to the reference Hono backend over HTTP + Server-Sent Events
- AI Studio–specific node types (`ai-studio/trigger`, `ai-studio/ai-agent`, `ai-studio/decision`)
- Live execution UI: Play/Stop controls, log panel, per-node status markers, edge highlighting, node-detail overlay

This is a sibling to `apps/demo`, not a layer over it. They share the SDK; nothing else.

## Compared to apps/demo

|              | `apps/demo`                 | `apps/ai-studio`                                         |
| ------------ | --------------------------- | -------------------------------------------------------- |
| Purpose      | Minimal embed showcase      | Full AI workflow product                                 |
| Backend      | None (pure SPA)             | Required (Hono + Temporal)                               |
| Plugin model | Plugins decorate the editor | Direct JSX composition; one slim plugin for node markers |
| Dev port     | 4200                        | 4201                                                     |

## Agent Harness node

`Agent Harness` (`ai-studio/agent-harness`) delegates a workflow step to an external
autonomous coding-agent CLI (GitHub Copilot in v1) instead of a single bounded LLM call.
Its property panel has four accordion sections: **General** (label, prompt, provider),
**Execution** (model, effort, context, idle timeout), **Tools** (tools preset,
allowed/denied tool lists), and **Advanced** (output format, MCP config, skills,
sub-agents, max budget, mutates-checkout, persist-session).

**Functional in v1:** `prompt`, `provider` (`copilot` only), `model`, `effort`,
`idle_timeout`, `mutatesCheckout`, `agents`.

**Rendered but NOT YET SUPPORTED in v1** (backend deferred, but per issue #147's "fields
must still render" requirement they are intentionally present rather than hidden —
this is not an oversight): `context` beyond `'fresh'` (`'shared'`/`'resume'` need session
persistence), `output_format` (no structured-output enforcement yet), `mcp`, `skills`,
`maxBudgetUsd`, `persistSession`. Each of these fields' label/placeholder in the panel
says "not yet supported" so this is visible in the UI itself, not just in this doc.

**`idle_timeout` is in milliseconds, not seconds.** `300` means 300ms; for a 5-minute
timeout set `idle_timeout: 300000`.

**Demo template:** "Agent Harness Demo" (`data/agent-harness-flow.ts`) — a
`trigger` → `agent-harness` → `visualize` chain that asks the agent to write a
`plan.md` outlining rate-limiting approaches and summarize the tradeoffs, exercising
both file tools and a returned text result.

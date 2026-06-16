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

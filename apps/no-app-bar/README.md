# No App Bar (reference)

Reference app for [WB-217](https://app.clickup.com/t/86c9yn7p4) — demonstrates `useWorkflowBuilderActions()`.

Mounts `<WorkflowBuilder.Root>` with a custom layout that **omits** `<WorkflowBuilder.TopBar />`. A hand-rolled `<Toolbar />` (in `src/app/toolbar.tsx`) wires every SDK command (save / import / export / settings / read-only / theme / layout-direction) to its own button through the new hook.

## Run

```bash
pnpm --filter @workflow-builder/no-app-bar dev
# → http://127.0.0.1:4202
```

Persistence is the SDK default (`localStorage`) — no backend needed.

## What to look at

- [`src/app/toolbar.tsx`](./src/app/toolbar.tsx) — the only file consuming `useWorkflowBuilderActions()`. Every button maps directly to one returned action.
- [`src/app/app.tsx`](./src/app/app.tsx) — composes a custom layout instead of using `<WorkflowBuilder.DefaultLayout />` or `<WorkflowBuilder.TopBar />`.

## Related docs

- Guide: [Layout without the app bar](../../apps/docs/src/content/docs/guides/no-app-bar-layout.md)
- Hook source: [`packages/sdk/src/hooks/use-workflow-builder-actions.ts`](../../packages/sdk/src/hooks/use-workflow-builder-actions.ts)

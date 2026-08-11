# Workflow Builder — Starter

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/fork/github/synergycodes/workflowbuilder/tree/feat/MARK-3156-stackblitz-starter-example/examples/workflow-builder-starter?title=Workflow%20Builder%20Starter%20Example&file=src%2Fapp.tsx)

A minimal, one-click example of [Workflow Builder](https://www.workflowbuilder.io/): a
React + TypeScript + Vite app that embeds the `@workflowbuilder/sdk` editor.

Workflow Builder is a workflow editor **built on [React Flow](https://reactflow.dev/)**.
`<WorkflowBuilder.Root>` owns the React Flow canvas and adds a node palette, a
schema-driven properties panel, persistence, theming, and validation. You get a complete
editor from one component, instead of wiring React Flow by hand.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL (Vite defaults to http://localhost:5173).

## What's here

- **`src/app.tsx`** — mounts `<WorkflowBuilder.Root>` with the default layout (top bar,
  palette, canvas, properties panel) and `localStorage` persistence.
- **`src/nodes/`** — three example node types (`trigger`, `action`, `condition`). Each is
  the canonical 4-file pattern: `schema.ts` (data), `uischema.ts` (form),
  `default-properties-data.ts` (defaults), and the `PaletteItem` definition.
- **`src/diagram/initial-diagram.ts`** — a small `Trigger → Action → Condition` flow shown
  on first open.

## Try it

- Drag a node from the palette onto the canvas.
- Click a node to edit its properties on the right.
- Connect nodes by dragging from one handle to another.

## Next steps

- Add your own node type by copying a folder under `src/nodes/` and registering it in
  `src/nodes/index.ts`.
- Full guide and API reference: <https://www.workflowbuilder.io/docs/overview/>

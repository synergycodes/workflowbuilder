import { ReactFlowProvider } from '@xyflow/react';
import { useLayoutEffect, useRef } from 'react';

import { registerPluginTranslation } from '../features/plugins-core/adapters/adapter-i18n';

import { setCustomNodeTemplates } from '../data/node-templates';
import { setCustomPaletteNodes } from '../data/palette';
import { setCustomTemplates } from '../data/templates';
import { RuntimeIntegrationWrapper } from '../features/integration/components/runtime-integration-wrapper';
import { registerCustomCells, registerCustomRenderers } from '../features/json-form/extension-registry';
import { resetWorkflowStore } from '../store/store';
import { resolveIntegration } from './resolve-integration';
import { RootShell } from './root-shell';
import type {
  WorkflowBuilderJsonFormConfig,
  WorkflowBuilderPlugin,
  WorkflowBuilderRootProps,
} from './workflow-builder-root.types';

/**
 * Top-level component that wires up the Workflow Builder editor. Provides
 * the per-instance store, integration wrapper, ReactFlow context, global
 * overlay (snackbar, loader, plugin hooks), and renders either the
 * supplied children or `<DefaultLayout />` as a fallback.
 *
 * @example Hello world
 * ```tsx
 * import { WorkflowBuilder } from '@workflowbuilder/sdk';
 *
 * export function App() {
 *   return <WorkflowBuilder.Root nodeTypes={myNodeTypes} />;
 * }
 * ```
 *
 * @example Custom layout
 * ```tsx
 * <WorkflowBuilder.Root nodeTypes={myNodeTypes}>
 *   <header><WorkflowBuilder.TopBar /></header>
 *   <aside><WorkflowBuilder.Palette /></aside>
 *   <main><WorkflowBuilder.Canvas /></main>
 *   <aside><WorkflowBuilder.PropertiesPanel /></aside>
 * </WorkflowBuilder.Root>
 * ```
 *
 * @category Core
 */
export function WorkflowBuilderRoot({
  nodeTypes,
  nodeTemplates,
  templates,
  plugins,
  jsonForm,
  integration,
  name,
  layoutDirection,
  initialNodes,
  initialEdges,
  children,
}: WorkflowBuilderRootProps) {
  // Plugin / JsonForms boot — run once per Root lifetime on the first render
  // (synchronous, before children mount). `useRef` is explicit "did init"
  // bookkeeping; preferred over a lazy `useState(() => { …; return null })`
  // because we hold no state, just a one-shot guard.
  //
  // Strict mode in dev calls function components twice on first mount; the
  // registry APIs deduplicate by `name`, so a second call is a no-op.
  const booted = useRef(false);
  if (!booted.current) {
    booted.current = true;
    bootPluginsAndExtensions(plugins, jsonForm);
  }

  // Reset the global store to its initial state on each fresh mount, so a new
  // Root starts with a clean editor — preserving the documented "sequential
  // workflows" contract (mount → save → unmount → mount next) now that the
  // store is a persistent module-level singleton rather than created per Root.
  //
  // Why `useLayoutEffect` (not render body, not `useEffect`):
  //   - Render body is out: `resetWorkflowStore` calls `useStore.setState`,
  //     which notifies subscribers; doing that during render risks React's
  //     "cannot update a component while rendering a different component" path
  //     for any external `useStore` subscriber (the store is global now).
  //   - `useEffect` is out: passive effects fire children-first, so the
  //     descendant `IntegrationWrapper.loadData` (a `useEffect`) would run
  //     BEFORE a Root-level `useEffect`, and the reset would wipe the diagram
  //     it just loaded. Layout effects fire before any passive effect, so a
  //     Root `useLayoutEffect` reset is guaranteed to precede `loadData`.
  //
  // Empty deps → mount-only: a re-render must NOT reset (that would discard
  // user edits); a true unmount → remount gets a fresh reset, which is exactly
  // the sequential-workflow behavior we want.
  useLayoutEffect(() => {
    resetWorkflowStore();
  }, []);

  // Runtime config — write the latest prop values into module-level holders
  // synchronously in render, NOT in `useEffect`. Children read the holders
  // during their own first render (e.g. the palette resolver), so an effect
  // would land one tick too late.
  //
  // The writes are safe in render body because:
  //   - both setters are plain assignments to module-level variables; they
  //     don't notify subscribers and don't trigger re-renders;
  //   - they're idempotent — re-assigning the same reference is a no-op;
  //   - strict mode renders this twice; both runs write the same value.
  //
  // Red flags that would break this:
  //   - a setter starting to notify subscribers → potential render loop;
  //   - consumers passing unstable references (e.g. `nodeTypes={[...]}`
  //     literal in the parent's render) → identity flap every render.
  //     Today all consumers pass stable top-level arrays.
  setCustomPaletteNodes(nodeTypes ?? null);
  setCustomTemplates(templates ?? null);
  setCustomNodeTemplates(nodeTemplates ?? null);

  const { strategy, endpoints, onDataSave } = resolveIntegration(integration);

  return (
    <RuntimeIntegrationWrapper
      strategy={strategy}
      endpoints={endpoints}
      onDataSave={onDataSave}
      name={name}
      layoutDirection={layoutDirection}
      nodes={initialNodes}
      edges={initialEdges}
    >
      <ReactFlowProvider>
        <RootShell>{children}</RootShell>
      </ReactFlowProvider>
    </RuntimeIntegrationWrapper>
  );
}

function bootPluginsAndExtensions(
  plugins: WorkflowBuilderPlugin[] | undefined,
  jsonForm: WorkflowBuilderJsonFormConfig | undefined,
): void {
  if (plugins) {
    for (const plugin of plugins) plugin();
  }
  if (jsonForm?.renderers?.length) registerCustomRenderers(jsonForm.renderers);
  if (jsonForm?.cells?.length) registerCustomCells(jsonForm.cells);
  if (jsonForm?.translations) registerPluginTranslation(jsonForm.translations);
}

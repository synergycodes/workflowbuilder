import type { ComponentType, PropsWithChildren } from 'react';

import type { WorkflowNodeTemplateProps } from '../features/diagram/nodes/workflow-node-template/workflow-node-template';
import type {
  JsonFormsCellExtension,
  JsonFormsRendererExtension,
  PluginTranslationResource,
} from '../features/json-form/extension-registry';
import type { LayoutDirection, PaletteItemOrGroup, TemplateModel } from '../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../node/node-data';
import type { OnSaveExternal } from '../types/integration';

/**
 * Per-node-type custom template registry. Keys are `data.type` values from
 * the palette; values are React components that take
 * {@link WorkflowNodeTemplateProps} and replace the default node renderer
 * for matching nodes.
 *
 * @category Components
 */
export type WorkflowBuilderNodeTemplates = Record<string, ComponentType<WorkflowNodeTemplateProps>>;

/**
 * Plugin initializer — a synchronous function invoked exactly once on the
 * first mount of `<WorkflowBuilder.Root>`. Inside the body call one of the
 * SDK's `register*` APIs:
 *
 * - `registerComponentDecorator` — inject UI / hooks into a known slot
 * - `registerFunctionDecorator` — intercept a registered function before/after
 * - `registerPluginTranslation` — add i18next strings under `plugins.<name>`
 * - `registerCustomRenderers` / `registerCustomCells` — extend JsonForms
 *
 * Plugins write into module-level registries; they do **not** see the per-Root
 * store. The Root invokes them through a `useRef`-guarded first-render hook,
 * so strict-mode double-render is a no-op and re-renders skip the work.
 *
 * @example
 * ```ts
 * const myPlugin: WorkflowBuilderPlugin = () => {
 *   registerComponentDecorator('OptionalAppBarTools', {
 *     content: MyButton,
 *     name: 'my-plugin',
 *   });
 * };
 * ```
 *
 * @category Plugins
 */
export type WorkflowBuilderPlugin = () => void;

/**
 * Persistence strategy for a `<WorkflowBuilder.Root>` instance. Exactly one
 * variant applies. `integration` is itself optional — omitting it picks the
 * `localStorage` default.
 *
 * @category Integration
 */
export type WorkflowBuilderIntegration =
  /** Default — save to browser localStorage under `'workflowBuilderDiagram'`. Selected when `integration` is omitted entirely or set to `{}`. */
  | { strategy?: 'localStorage' }
  /** REST persistence — SDK issues `GET endpoints.load` and `POST endpoints.save` on every save event. */
  | { strategy: 'api'; endpoints: { load: string; save: string } }
  /** Host-managed — SDK invokes `onDataSave` with the diagram payload on every save event; the host owns where it lands. */
  | { strategy: 'props'; onDataSave: OnSaveExternal };

/**
 * JsonForms extensions registered with the editor: custom renderers, cell
 * renderers, and plugin translations.
 *
 * @category Plugins
 */
export type WorkflowBuilderJsonFormConfig = {
  renderers?: JsonFormsRendererExtension[];
  cells?: JsonFormsCellExtension[];
  translations?: PluginTranslationResource;
};

/**
 * Props accepted by `<WorkflowBuilder.Root>`.
 *
 * @category Core
 */
export type WorkflowBuilderRootProps = PropsWithChildren<{
  /**
   * Node type definitions rendered in the palette and used for validation.
   * **Must be a stable reference** — declare at module level or memoize.
   * Passing an inline literal (`nodeTypes={[...]}`) overwrites the SDK's
   * module-level palette holder on every parent re-render.
   */
  nodeTypes?: PaletteItemOrGroup[];
  /**
   * Per-node-type custom renderers — map of `data.type` → React component.
   * Overrides the default `WorkflowNodeTemplate` for the matching node type.
   * Use {@link defineNodeTemplate} for the typing helper.
   *
   * **Must be a stable reference** (same rationale as `nodeTypes`).
   */
  nodeTemplates?: WorkflowBuilderNodeTemplates;
  /**
   * Diagram templates available in the template selector.
   * **Must be a stable reference** (same rationale as `nodeTypes`).
   */
  templates?: TemplateModel[];
  /** Plugin initializers invoked synchronously, in order, on first mount. */
  plugins?: WorkflowBuilderPlugin[];
  /** Custom JsonForms renderers / cells / translations. */
  jsonForm?: WorkflowBuilderJsonFormConfig;
  /** Persistence strategy. Defaults to `{ strategy: 'localStorage' }`. */
  integration?: WorkflowBuilderIntegration;
  /** Workflow name displayed in the app bar and persisted with the diagram. */
  name?: string;
  /** Initial layout direction (`'RIGHT'` or `'DOWN'`). */
  layoutDirection?: LayoutDirection;
  /** Initial nodes rendered on first mount. */
  initialNodes?: WorkflowBuilderNode[];
  /** Initial edges rendered on first mount. */
  initialEdges?: WorkflowBuilderEdge[];
}>;

import type { Connection, EdgeProps, ReactFlowProps } from '@xyflow/react';
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
 * Per-edge-type custom renderer registry. Keys are `edge.type` values; values
 * are React components that take ReactFlow's {@link EdgeProps} (typed for
 * {@link WorkflowBuilderEdge}) and replace the default edge renderer for
 * matching edges.
 *
 * Unlike node templates, edge templates need no adapter: the built-in edges
 * already take `EdgeProps` directly, so a consumer component drops straight
 * into ReactFlow's edge-type map with no wrapping.
 *
 * @category Components
 */
export type WorkflowBuilderEdgeTemplates = Record<string, ComponentType<EdgeProps<WorkflowBuilderEdge>>>;

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
 * Arguments for {@link WorkflowBuilderIsValidConnection}. Source / target nodes
 * are resolved from the connection's ids, so a rule can branch on node `data`.
 *
 * @category Core
 */
export type WorkflowBuilderIsValidConnectionParams = {
  /** The connection candidate (handle ids normalized to `null`). */
  connection: Connection;
  /** Node the connection is dragged from. */
  sourceNode: WorkflowBuilderNode;
  /** Node the connection is dragged to. */
  targetNode: WorkflowBuilderNode;
};

/**
 * Decides whether a dragged connection is allowed. Return `false` to block the
 * drop (no edge created, no flicker). Fail-open: if an endpoint can't be
 * resolved to a node, the connection is allowed and this is not invoked.
 *
 * @category Core
 */
export type WorkflowBuilderIsValidConnection = (params: WorkflowBuilderIsValidConnectionParams) => boolean;

/**
 * ReactFlow props the SDK sets itself (spread last in `diagram.tsx`, so they win
 * over `reactFlowProps`) and omits from {@link WorkflowBuilderReactFlowProps}.
 * The `diagram.spec` precedence test enforces each one stays owned. Internal:
 * exported for that test only.
 */
export type SdkManagedReactFlowKey =
  | 'nodes'
  | 'edges'
  | 'nodeTypes'
  | 'edgeTypes'
  | 'onConnect'
  | 'onConnectStart'
  | 'onConnectEnd'
  | 'onNodesChange'
  | 'onEdgesChange'
  | 'onSelectionChange'
  | 'onInit'
  | 'onBeforeDelete'
  | 'onNodeDragStart'
  | 'onNodeDragStop'
  | 'onEdgeMouseEnter'
  | 'onEdgeMouseLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'connectionLineComponent'
  | 'nodesConnectable'
  | 'nodesDraggable'
  | 'isValidConnection';

/**
 * ReactFlow props omitted from {@link WorkflowBuilderReactFlowProps} but not
 * re-set in `diagram.tsx`. `default*` are no-ops under the SDK's controlled
 * `nodes` / `edges`; `colorMode` would clash with the SDK theme. Type-level guard
 * only (a JS / `as`-cast consumer can still smuggle them; worst case is cosmetic).
 */
type SdkReservedReactFlowKey = 'defaultNodes' | 'defaultEdges' | 'colorMode';

/** Every ReactFlow key the escape hatch must not expose. */
type SdkOwnedReactFlowKey = SdkManagedReactFlowKey | SdkReservedReactFlowKey;

/** Compiles only when `A extends B`. Fails the build if an owned key stops being a real ReactFlow prop (`Omit` doesn't validate keys). */
type AssertAssignable<A extends B, B> = A;

/**
 * Escape hatch for the underlying ReactFlow canvas: forwards any ReactFlow prop
 * except the ones the SDK owns ({@link SdkOwnedReactFlowKey}). Theme via the SDK
 * design tokens, not `colorMode`.
 *
 * Treat as static config: the canvas reads it out-of-band, so changing a value
 * at runtime may not apply until the canvas re-renders.
 *
 * @category Core
 */
export type WorkflowBuilderReactFlowProps = Omit<
  ReactFlowProps<WorkflowBuilderNode, WorkflowBuilderEdge>,
  AssertAssignable<SdkOwnedReactFlowKey, keyof ReactFlowProps<WorkflowBuilderNode, WorkflowBuilderEdge>>
>;

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
   * Per-edge-type custom renderers. Map of `edge.type` to a React component.
   * Overrides the built-in `'labelEdge'` for the matching edge type; edges
   * whose type isn't registered fall back to the default edge.
   *
   * Each component is authored exactly like a ReactFlow custom edge (it takes
   * `EdgeProps` directly). The only SDK-specific step is registering it here
   * instead of via ReactFlow's `edgeTypes`. See ReactFlow's "Custom Edges"
   * guide: https://reactflow.dev/learn/customization/custom-edges. To match the
   * built-in selection and hover look, reuse the exported `useLabelEdgeHover`
   * and `EnhancedBaseEdge`, or restyle selection globally via the
   * `--ax-public-edge-color-select` CSS variable. A custom edge does not inherit
   * the built-in self-connecting loop or label rendering.
   *
   * **Must be a stable reference** (same rationale as `nodeTemplates`).
   */
  edgeTemplates?: WorkflowBuilderEdgeTemplates;
  /**
   * Diagram templates available in the template selector.
   * **Must be a stable reference** (same rationale as `nodeTypes`).
   */
  diagramTemplates?: TemplateModel[];
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
  /**
   * Validate connections as the user draws them. Return `false` to reject the
   * drop. **Must be a stable reference.**
   *
   * @example
   * ```ts
   * const isValidConnection: WorkflowBuilderIsValidConnection = ({ sourceNode, targetNode }) =>
   *   !(sourceNode.data.type === 'start' && targetNode.data.type === 'start');
   * ```
   */
  isValidConnection?: WorkflowBuilderIsValidConnection;
  /**
   * Advanced escape hatch: forwards extra props to the ReactFlow canvas (see
   * {@link WorkflowBuilderReactFlowProps}). Treat as static config; runtime value
   * changes may not apply immediately.
   */
  reactFlowProps?: WorkflowBuilderReactFlowProps;
}>;

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
 * Arguments passed to a {@link WorkflowBuilderIsValidConnection} callback. The
 * SDK resolves the source and target nodes from the connection's node ids, so a
 * rule can branch on `data.type` / `data.properties` without touching the store.
 *
 * @category Core
 */
export type IsValidConnectionParams = {
  /** Raw ReactFlow connection candidate — source / target node ids + handle ids. */
  connection: Connection;
  /** The node the connection is dragged from (resolved from `connection.source`). */
  sourceNode: WorkflowBuilderNode;
  /** The node the connection is dragged to (resolved from `connection.target`). */
  targetNode: WorkflowBuilderNode;
};

/**
 * Decides whether a connection between two nodes is allowed. Runs live while
 * the user drags a connection: return `false` to block the drop. No edge is
 * created and there is no flicker, because the connection is rejected before it
 * ever enters the graph.
 *
 * Fail-open: if either endpoint can't be resolved to a node in the store, the
 * connection is allowed and this callback is not invoked, so a strict
 * deny-by-default rule still can't block a drop whose nodes are unknown.
 *
 * @category Core
 */
export type WorkflowBuilderIsValidConnection = (params: IsValidConnectionParams) => boolean;

/**
 * ReactFlow props the SDK manages itself and spreads last in `diagram.tsx`, so
 * they always win at runtime. Omitted from {@link WorkflowBuilderReactFlowProps}.
 * Edit this union when the SDK starts or stops managing a prop.
 */
type SdkManagedReactFlowKey =
  | 'nodes'
  | 'edges'
  | 'defaultNodes'
  | 'defaultEdges'
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
 * ReactFlow props the SDK reserves but does not set: governed elsewhere, so a
 * `reactFlowProps` override would silently fight that system. `colorMode` is
 * owned by the SDK theming layer (design tokens / `initTheme`), so it is omitted
 * here rather than left to conflict with the active theme.
 */
type SdkReservedReactFlowKey = 'colorMode';

/** Every ReactFlow key the escape hatch must not expose. */
type SdkOwnedReactFlowKey = SdkManagedReactFlowKey | SdkReservedReactFlowKey;

/**
 * Identity type that compiles only when `A` is assignable to `B`. Used below so
 * an owned key that is no longer a real ReactFlow prop fails the build (`Omit`
 * does not validate its keys).
 */
type AssertAssignable<A extends B, B> = A;

/**
 * Escape hatch for the underlying ReactFlow canvas: forwards any ReactFlow prop
 * except the ones the SDK owns ({@link SdkOwnedReactFlowKey}), which are omitted
 * here and always win at runtime, so the editor cannot be broken from the
 * outside. Theme via the SDK design tokens rather than ReactFlow's `colorMode`
 * (omitted here for that reason).
 *
 * **Must be a stable reference** — declare at module level or memoize.
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
   * Validate connections as the user draws them. Receives the candidate
   * `connection` plus the resolved `sourceNode` / `targetNode`; return `false`
   * to reject it. An invalid drop creates no edge and does not flicker.
   *
   * **Must be a stable reference** (declare at module level or memoize).
   *
   * @example
   * ```ts
   * const isValidConnection: WorkflowBuilderIsValidConnection = ({ sourceNode, targetNode }) =>
   *   !(sourceNode.data.type === 'start' && targetNode.data.type === 'start');
   * ```
   */
  isValidConnection?: WorkflowBuilderIsValidConnection;
  /**
   * Advanced. Forwards extra props to the underlying ReactFlow canvas. See
   * {@link WorkflowBuilderReactFlowProps} for what is allowed.
   */
  reactFlowProps?: WorkflowBuilderReactFlowProps;
}>;

// Library entry point for @workflowbuilder/sdk.
// Built by packages/sdk/vite.config.mts into dist/ as a distributable npm package.
// Bundles all required CSS (app + xyflow + overflow-ui) into style.css.
import './index.css';

import './bootstrap';
import { AppBarContainer } from './features/app-bar/app-bar-container';
import { DefaultLayout } from './features/default-layout/default-layout';
import { DiagramContainer } from './features/diagram/diagram';
import { PaletteContainer } from './features/palette/palette-container';
import { PropertiesBarContainer } from './features/properties-bar/properties-bar-container';
import { WorkflowBuilderRoot } from './workflow-builder-root';

// =============================================================================
// Core API — compound namespace
// =============================================================================

/**
 * Workflow Builder compound component. Mount `<WorkflowBuilder.Root>` at the
 * top of the editor subtree; compose with `.TopBar`, `.Palette`, `.Canvas`,
 * `.PropertiesPanel`, or `.DefaultLayout` as children (or omit children to
 * get the default floating-overlay layout).
 *
 * ```tsx
 * import { WorkflowBuilder } from '@workflowbuilder/sdk';
 *
 * <WorkflowBuilder.Root nodeTypes={myNodeTypes} />
 * ```
 *
 * @category Core
 */
export const WorkflowBuilder = Object.freeze({
  Root: WorkflowBuilderRoot,
  TopBar: AppBarContainer,
  Palette: PaletteContainer,
  Canvas: DiagramContainer,
  PropertiesPanel: PropertiesBarContainer,
  DefaultLayout,
});

// Per-subcomponent named exports, mirroring `WorkflowBuilder.*`. Consumers
// who prefer the classic style (`<WorkflowBuilderCanvas />`) or want a
// dedicated JSDoc per symbol on IDE hover use these; both forms resolve
// to the same component, picked by whichever style the caller prefers.
export { WorkflowBuilderRoot } from './workflow-builder-root';
export { AppBarContainer as WorkflowBuilderTopBar } from './features/app-bar/app-bar-container';
export { PaletteContainer as WorkflowBuilderPalette } from './features/palette/palette-container';
export { DiagramContainer as WorkflowBuilderCanvas } from './features/diagram/diagram';
export { PropertiesBarContainer as WorkflowBuilderPropertiesPanel } from './features/properties-bar/properties-bar-container';
export { DefaultLayout as WorkflowBuilderDefaultLayout } from './features/default-layout/default-layout';

export type {
  WorkflowBuilderRootProps,
  WorkflowBuilderPlugin,
  WorkflowBuilderIntegration,
  WorkflowBuilderJsonFormConfig,
  WorkflowBuilderNodeTemplates,
} from './workflow-builder-root';

// =============================================================================
// Plugin API — decorators, function hooks, translations
// =============================================================================

export {
  registerComponentDecorator,
  hasRegisteredComponentDecorator,
} from './features/plugins-core/adapters/adapter-components';
export type { ComponentDecoratorOptions } from './features/plugins-core/adapters/adapter-components';

export { registerFunctionDecorator } from './features/plugins-core/adapters/adapter-functions';
export type { FunctionDecoratorOptions, CallbackAfter } from './features/plugins-core/adapters/adapter-functions';

export { registerPluginTranslation } from './features/plugins-core/adapters/adapter-i18n';
export type {
  JsonFormsRendererExtension,
  JsonFormsCellExtension,
  PluginTranslationResource,
} from './features/json-form/extension-registry';

// =============================================================================
// Integration
// =============================================================================

export type {
  IntegrationDataFormat,
  IntegrationDataFormatOptional,
  IntegrationStrategy,
  OnSaveExternal,
  OnSaveParams,
  DidSaveStatus,
} from './types/integration';

// =============================================================================
// Domain types
// =============================================================================

export type {
  DiagramModel,
  IconType,
  LayoutDirection,
  PaletteItem,
  PaletteItemOrGroup,
  TemplateModel,
} from './node/common';
export type { WorkflowBuilderNode, WorkflowBuilderEdge, NodeData } from './node/node-data';
export type { NodeSchema, Option } from './node/node-schema';
export { NodeType } from './node/node-types';
export type { IfThenElseSchema } from './node/node-validation-schema';
export type { NodeDataProperties } from './types/default-properties';
export type { UISchema } from './types/uischema';

// =============================================================================
// UI components — available to plugins as building blocks
// =============================================================================

export { FormControlWithLabel } from './components/form/form-control-with-label/form-control-with-label';
// `DiagramContainer` value is only available through `WorkflowBuilder.Canvas`
// or the `WorkflowBuilderCanvas` named alias above — same component, two
// public paths. The `Props` type stays exported so decorators can type
// `registerComponentDecorator<DiagramContainerProps>('DiagramContainer', …)`.
export type { DiagramContainerProps } from './features/diagram/diagram';
export { EnhancedBaseEdge } from './features/diagram/edges/enhanced-base-edge/enhanced-base-edge';
export { EdgeLabel } from './features/diagram/edges/edge-label-renderer/edge-label-renderer';
export { LabelEdge } from './features/diagram/edges/label-edge/label-edge';
export { SelfConnectingEdge } from './features/diagram/edges/self-connecting-edge/self-connecting-edge';
export { NodeSection } from './features/diagram/nodes/components/node-section/node-section';
export { OptionalNodeContent } from './features/plugins-core/components/diagram/optional-node-content';
export { ProjectSelection } from './features/app-bar/components/project-selection/project-selection';
export type { ProjectSelectionProps } from './features/app-bar/components/project-selection/project-selection';
export { PropertiesBar } from './features/properties-bar/components/properties-bar/properties-bar';
export type { PropertiesBarProps } from './features/properties-bar/components/properties-bar/properties-bar.types';
export { SyntaxHighlighterLazy } from './features/syntax-highlighter/components/syntax-highlighter-lazy';
export type { WorkflowNodeTemplateProps } from './features/diagram/nodes/workflow-node-template/workflow-node-template';
export { defineNodeTemplate } from './utils/define-node-template';

// =============================================================================
// Hooks
// =============================================================================

export { useEffectChange } from './hooks/use-effect-change';
export { useFitView } from './hooks/use-fit-view';
export { useKeyPress } from './hooks/use-key-press';
export { useWorkflowBuilderActions } from './hooks/use-workflow-builder-actions';
export type { LayoutChangeOptions, WorkflowBuilderActions } from './hooks/use-workflow-builder-actions';
export type { Theme } from './hooks/theme';
export { useLabelEdgeHover } from './features/diagram/edges/label-edge/use-label-edge-hover';
export { useSingleSelectedElement } from './features/properties-bar/use-single-selected-element';
export { useChangesTrackerStore, trackFutureChange } from './features/changes-tracker/stores/use-changes-tracker-store';

// =============================================================================
// Store access (hook, action helpers, modal registry)
// =============================================================================
// The SDK is single-instance (mount one `<WorkflowBuilder.Root>` per page).
// The Zustand store is a module-level global singleton, created once at import
// time; `<WorkflowBuilder.Root>` resets it to a clean state on mount.
// `WorkflowEditorState` is intentionally NOT re-exported — consumers don't
// construct the store, they read it. Use `useStore` (selector hook) or the
// imperative `useStore.{getState,setState,subscribe}` facade that the bound
// store exposes directly.

export { useStore } from './store/store';
export {
  getStoreNodes,
  setStoreNodes,
  getStoreEdges,
  setStoreEdges,
  getStoreLayoutDirection,
  setStoreLayoutDirection,
  getStoreDataForIntegration,
} from './store/slices/diagram-slice/actions';
export { getStoreSelection, resetStoreSelection } from './store/slices/diagram-selection/actions';

export { openModal } from './features/modals/stores/use-modal-store';

// =============================================================================
// Diagram listeners + helpers
// =============================================================================

export type { NodeChangedListener } from './features/diagram/listeners/node-changed-listeners';
export {
  addNodeChangedListener,
  removeNodeChangedListener,
  useNodeChangedListener,
} from './features/diagram/listeners/node-changed-listeners';
export {
  addNodeDragStartListener,
  removeNodeDragStartListener,
  useNodeDragStartListener,
} from './features/diagram/listeners/node-drag-start-listeners';

export { getHandleId } from './features/diagram/handles/get-handle-id';

// =============================================================================
// JsonForms helpers (plugin schema authoring)
// =============================================================================

export { getScope } from './features/json-form/utils/get-scope';
export type { ComparisonOperator } from './features/variables/constants';
export type { DynamicCondition } from './features/json-form/types/controls';

// =============================================================================
// Utilities
// =============================================================================

export { generalInformation, globalControls, statusOptions } from './utils/general-information';
export { sharedProperties, errorPolicyProperty } from './utils/shared-properties';
export type { DeepPartial, Prettify } from './utils/typescript';

// =============================================================================
// Constants
// =============================================================================

export {
  EDGE_CURVE_RADIUS,
  EDGE_OFFSET,
  SELF_CONNECTING_EDGE_LABEL_OFFSET,
} from './features/diagram/edges/edge.consts';
export { VARIABLE_NODES_KEY } from './features/variables/constants';

// =============================================================================
// i18n
// =============================================================================

export type { TranslationKey } from './features/i18n/i18next';

// =============================================================================
// Icons
// =============================================================================

// Re-exported so consumer code (incl. plugin source distributions) resolves icons
// entirely through @workflowbuilder/sdk without needing to install
// @workflow-builder/icons separately. Icons is bundled into dist at build time
// and inlined into dist/index.d.ts via vite-plugin-dts bundledPackages.

/**
 * Renders an icon by name. Names are typed via {@link WBIcon} —
 * autocomplete shows every icon bundled with the SDK.
 *
 * @category Icons
 */
export { Icon } from '@workflow-builder/icons';

/**
 * Union of every icon name shipped with the SDK. Use it to constrain
 * props that accept an icon (`icon: WBIcon`).
 *
 * @category Icons
 */
export type { WBIcon } from '@workflow-builder/icons';

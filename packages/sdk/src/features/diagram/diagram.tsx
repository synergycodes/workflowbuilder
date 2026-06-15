import {
  Background,
  type EdgeTypes,
  type NodeChange,
  type OnBeforeDelete,
  type OnConnect,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  ReactFlow,
  SelectionMode,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { type DragEventHandler, useCallback, useEffect, useMemo } from 'react';
import type { DragEvent } from 'react';

import styles from './diagram.module.css';
import '@xyflow/react/dist/style.css';

import { getReactFlowProps } from '../../data/react-flow-config';
import { usePaletteDrop } from '../../hooks/use-palette-drop';
import type { WorkflowBuilderOnSelectionChangeParams } from '../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../node/node-data';
import { getStoreNodes } from '../../store/slices/diagram-slice/actions';
import { useStore } from '../../store/store';
import type { WorkflowBuilderReactFlowProps } from '../../workflow-builder-root/workflow-builder-root.types';
import { trackFutureChange } from '../changes-tracker/stores/use-changes-tracker-store';
import { useDeleteConfirmation } from '../modals/delete-confirmation/use-delete-confirmation';
import { withOptionalComponentPlugins } from '../plugins-core/adapters/adapter-components';
import { deleteKeyCode } from './const';
import { SNAP_GRID, SNAP_IS_ACTIVE } from './diagram.const';
import { TemporaryEdge } from './edges/temporary-edge/temporary-edge';
import { useEdgeTypes } from './hooks/use-edge-types';
import { useNodeTypes } from './hooks/use-node-types';
import { useIsValidConnection } from './hooks/use-react-flow-config';
import { callNodeChangedListeners } from './listeners/node-changed-listeners';
import { callNodeDragStartListeners } from './listeners/node-drag-start-listeners';
import { diagramStateSelector } from './selectors';

/**
 * ReactFlow tuning the SDK applies by default. Spread before `reactFlowProps` so
 * a consumer can override any of it. Module level for a stable reference.
 */
const SDK_DEFAULT_FLOW_PROPS = {
  fitView: true,
  fitViewOptions: { maxZoom: 1 },
  panOnScroll: true,
  minZoom: 0.1,
  snapToGrid: SNAP_IS_ACTIVE,
  snapGrid: SNAP_GRID,
  selectionOnDrag: true,
  selectionMode: SelectionMode.Partial,
  deleteKeyCode,
  panOnDrag: [1, 2],
} satisfies WorkflowBuilderReactFlowProps;

/**
 * Props accepted by {@link DiagramContainer}. Use this when typing a
 * `registerComponentDecorator<DiagramContainerProps>('DiagramContainer', …)`
 * call.
 *
 * @category Components
 */
export type DiagramContainerProps = {
  /**
   * Extra edge types forwarded to ReactFlow alongside the built-in `'labelEdge'`
   * and any Root-level `edgeTemplates`. Merged last, so a key here intentionally
   * overrides those (this is the direct-mount escape hatch, hence no collision
   * warning); prefer `<WorkflowBuilder.Root edgeTemplates>` for app-wide edges.
   */
  edgeTypes?: EdgeTypes;
};

/**
 * The xyflow canvas — renders nodes, edges, the palette drop target, and
 * wires up selection / drag / connect / delete behaviour against the SDK's
 * store. Re-exported publicly as `DiagramContainer` and as
 * `WorkflowBuilder.Canvas`; mount it directly when assembling a custom
 * layout, or decorate via `registerComponentDecorator<DiagramContainerProps>('DiagramContainer', …)`.
 */
function DiagramContainerComponent({ edgeTypes = {} }: DiagramContainerProps) {
  const {
    nodes,
    edges,
    isReadOnlyMode,
    onNodesChange,
    onEdgesChange,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    onConnect: onConnectAction,
    onInit,
    onSelectionChange,
  } = useStore(diagramStateSelector);

  const { openDeleteConfirmationModal } = useDeleteConfirmation();

  const setConnectionBeingDragged = useStore((store) => store.setConnectionBeingDragged);
  const nodeTypes = useNodeTypes();
  const isValidConnection = useIsValidConnection();
  // Plain read, not a hook: the holder is written by `<WorkflowBuilder.Root>`
  // during its render (an ancestor), so the value is current by the time this
  // child renders, and the reference is stable (frozen empty object when unset).
  const consumerReactFlowProps = getReactFlowProps();

  // React Flow caches each handle's measured bounds in `nodeInternals`. When
  // `layoutDirection` flips, existing nodes re-render their `<Handle>` with a
  // new `position` prop, but the cache stays stale and edges keep routing to
  // the old port spots. Ask React Flow to remeasure every mounted node when
  // the direction changes.
  const layoutDirection = useStore((store) => store.layoutDirection);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    const ids = getStoreNodes().map((node) => node.id);
    if (ids.length > 0) updateNodeInternals(ids);
  }, [layoutDirection, updateNodeInternals]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const { onDropFromPalette } = usePaletteDrop();

  const onNodeDragStart: OnNodeDrag = useCallback((event, node, nodes) => {
    trackFutureChange('nodeDragStart');
    callNodeDragStartListeners(event, node, nodes);
  }, []);

  const onDrop: DragEventHandler = useCallback(
    (event) => {
      onDropFromPalette(event);
    },
    [onDropFromPalette],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      trackFutureChange('addEdge');
      onConnectAction(connection);
    },
    [onConnectAction],
  );

  const onConnectStart = useCallback(
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _: any,
      { nodeId, handleId }: { nodeId: string | null; handleId: string | null },
    ) => {
      setConnectionBeingDragged(nodeId, handleId);
    },
    [setConnectionBeingDragged],
  );

  const onConnectEnd = useCallback(() => {
    setConnectionBeingDragged(null, null);
  }, [setConnectionBeingDragged]);

  const onNodeDragStop = useCallback(() => {
    return trackFutureChange('nodeDragStop');
  }, []);

  const handleOnNodesChange = useCallback(
    (changes: NodeChange<WorkflowBuilderNode>[]) => {
      trackFutureChange('nodeDragChange');
      callNodeChangedListeners(changes);
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleOnSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      onSelectionChange(params as WorkflowBuilderOnSelectionChangeParams);
    },
    [onSelectionChange],
  );

  // Built-in edge renderers (`labelEdge`) plus any app-wide `edgeTemplates`
  // passed to `<WorkflowBuilder.Root>`. The local `edgeTypes` prop (direct
  // DiagramContainer mount) is merged last so a per-mount override still wins.
  const baseEdgeTypes = useEdgeTypes();
  const diagramEdgeTypes = useMemo(() => ({ ...baseEdgeTypes, ...edgeTypes }), [baseEdgeTypes, edgeTypes]);

  const onBeforeDelete: OnBeforeDelete<WorkflowBuilderNode, WorkflowBuilderEdge> = useCallback(
    async ({ nodes, edges }) => {
      if (isReadOnlyMode) {
        return false;
      }

      return new Promise((resolve) => {
        openDeleteConfirmationModal({
          nodes,
          edges,
          onDeleteClick: () => {
            trackFutureChange('delete');
            resolve(true);
          },
          onModalClosed: () => resolve(false),
        });
      });
    },
    [isReadOnlyMode, openDeleteConfirmationModal],
  );

  return (
    <div className={styles['container']}>
      <ReactFlow<WorkflowBuilderNode, WorkflowBuilderEdge>
        {...SDK_DEFAULT_FLOW_PROPS}
        {...consumerReactFlowProps}
        // SDK-owned props, spread last so they always win over `reactFlowProps`.
        // Keep them below the spreads.
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={diagramEdgeTypes}
        onInit={onInit}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgesChange={onEdgesChange}
        onNodesChange={handleOnNodesChange}
        onSelectionChange={handleOnSelectionChange}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onBeforeDelete={onBeforeDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        connectionLineComponent={TemporaryEdge}
        nodesConnectable={!isReadOnlyMode}
        nodesDraggable={!isReadOnlyMode}
        isValidConnection={isValidConnection}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

/**
 * Public canvas component. Mount directly via `<DiagramContainer />` /
 * `<WorkflowBuilder.Canvas />` when assembling a custom layout, or decorate
 * the slot through
 * `registerComponentDecorator<DiagramContainerProps>('DiagramContainer', …)`.
 *
 * @category Components
 */
export const DiagramContainer = withOptionalComponentPlugins(DiagramContainerComponent, 'DiagramContainer');

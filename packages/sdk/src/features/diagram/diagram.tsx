import {
  Background,
  type EdgeTypes,
  type FitViewOptions,
  type NodeChange,
  type OnBeforeDelete,
  type OnConnect,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  ReactFlow,
  SelectionMode,
} from '@xyflow/react';
import { type DragEventHandler, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';

import styles from './diagram.module.css';
import '@xyflow/react/dist/style.css';

import { usePaletteDrop } from '../../hooks/use-palette-drop';
import type { WorkflowBuilderOnSelectionChangeParams } from '../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../node/node-data';
import { useStore } from '../../store/store';
import { trackFutureChange } from '../changes-tracker/stores/use-changes-tracker-store';
import { useDeleteConfirmation } from '../modals/delete-confirmation/use-delete-confirmation';
import { withOptionalComponentPlugins } from '../plugins-core/adapters/adapter-components';
import { deleteKeyCode } from './const';
import { SNAP_GRID, SNAP_IS_ACTIVE } from './diagram.const';
import { LabelEdge } from './edges/label-edge/label-edge';
import { TemporaryEdge } from './edges/temporary-edge/temporary-edge';
import { useNodeTypes } from './hooks/use-node-types';
import { callNodeChangedListeners } from './listeners/node-changed-listeners';
import { callNodeDragStartListeners } from './listeners/node-drag-start-listeners';
import { diagramStateSelector } from './selectors';

// Pan with middle (1) and right (2) mouse buttons. Module-level so the array
// keeps a stable reference across renders — an inline literal would hand
// ReactFlow a new prop identity on every drag-tick re-render.
const PAN_ON_DRAG = [1, 2];

/**
 * Props accepted by {@link DiagramContainer}. Use this when typing a
 * `registerComponentDecorator<DiagramContainerProps>('DiagramContainer', …)`
 * call.
 *
 * @category Components
 */
export type DiagramContainerProps = {
  /** Extra edge types forwarded to ReactFlow alongside the built-in `'labelEdge'`. */
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

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const { onDropFromPalette } = usePaletteDrop();

  const fitViewOptions: FitViewOptions = useMemo(() => ({ maxZoom: 1 }), []);

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

  const diagramEdgeTypes = useMemo(() => ({ labelEdge: LabelEdge, ...edgeTypes }), [edgeTypes]);

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
        edges={edges}
        edgeTypes={diagramEdgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        onDragOver={onDragOver}
        onInit={onInit}
        onDrop={onDrop}
        connectionLineComponent={TemporaryEdge}
        panOnScroll
        nodes={nodes}
        nodesConnectable={!isReadOnlyMode}
        nodesDraggable={!isReadOnlyMode}
        nodeTypes={nodeTypes}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onNodesChange={handleOnNodesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onBeforeDelete={onBeforeDelete}
        onSelectionChange={handleOnSelectionChange}
        minZoom={0.1}
        snapToGrid={SNAP_IS_ACTIVE}
        snapGrid={SNAP_GRID}
        selectionOnDrag
        panOnDrag={PAN_ON_DRAG}
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={deleteKeyCode}
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

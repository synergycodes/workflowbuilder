import { DragEventHandler, useCallback, useEffect, useMemo } from 'react';
import useStore from '@/store/store';
import { diagramStateSelector } from './selectors';
import styles from './diagram.module.css';
import { DragEvent } from 'react';
import { getNodeTypesObject } from './get-node-types-object';
import {
  ReactFlow,
  Background,
  FitViewOptions,
  NodeChange,
  OnConnect,
  OnNodeDrag,
  OnBeforeDelete,
  EdgeTypes,
  SelectionMode,
  OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowBuilderOnSelectionChangeParams } from '@workflow-builder/types/common';
import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { LabelEdge } from './edges/label-edge/label-edge';
import { usePaletteDrop } from '@/hooks/use-palette-drop';
import {
  callNodeChangedListeners,
  destroyNodeChangedListeners,
} from '@/features/diagram/listeners/node-changed-listeners';
import { callNodeDragStartListeners, destroyNodeDragStartListeners } from './listeners/node-drag-start-listeners';
import { SNAP_GRID, SNAP_IS_ACTIVE } from '@/features/diagram/diagram.const';
import { withOptionalComponentPlugins } from '@/features/plugins-core/adapters/adapter-components';
import { TemporaryEdge } from './edges/temporary-edge/temporary-edge';
import { useDeleteConfirmation } from '@/features/modals/delete-confirmation/use-delete-confirmation';
import { trackFutureChange } from '@/features/changes-tracker/stores/use-changes-tracker-store';

function DiagramContainerComponent({ edgeTypes = {} }: { edgeTypes?: EdgeTypes }) {
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
  const nodeTypes = useMemo(getNodeTypesObject, []);

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
      trackFutureChange('addNode');
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

  useEffect(() => {
    destroyNodeChangedListeners();
    destroyNodeDragStartListeners();
  }, []);

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

  const panOnDrag = [1, 2];

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
        panOnDrag={panOnDrag}
        selectionMode={SelectionMode.Partial}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

export const DiagramContainer = withOptionalComponentPlugins(DiagramContainerComponent, 'DiagramContainer');

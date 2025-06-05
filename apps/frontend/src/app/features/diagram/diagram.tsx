import { DragEventHandler, useCallback, useContext, useEffect, useMemo } from 'react';
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
import { UndoRedoContext } from '@/providers/undo-redo-provider';
import { LabelEdge } from './edges/label-edge/label-edge';
import { usePaletteDrop } from '@/hooks/use-palette-drop';
import { callNodeChangedListeners, destroyNodeChangedListeners } from '@/utils/node-changed-listeners';
import { SNAP_GRID, SNAP_IS_ACTIVE } from '@/features/diagram/diagram.const';
import { withOptionalPlugins } from '@/features/plugins/utils/adapter-components';
import { TemporaryEdge } from './edges/temporary-edge/temporary-edge';
import { useDeleteConfirmation } from '@/features/modals/delete-confirmation/use-delete-confirmation';
import { WorkflowBuilderOnSelectionChangeParams } from '@workflow-builder/types/common';
import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { Watermark } from '../watermark/watermark';

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

  const { takeSnapshot, startSnapshotWatching, stopSnapshotWatching, processSnapshotWatching } =
    useContext(UndoRedoContext);

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    startSnapshotWatching('nodeDrag', 1);
  }, [startSnapshotWatching]);

  const onDrop: DragEventHandler = useCallback(
    (event) => {
      takeSnapshot();
      onDropFromPalette(event);
    },
    [takeSnapshot, onDropFromPalette],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      takeSnapshot();
      onConnectAction(connection);
    },
    [takeSnapshot, onConnectAction],
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
    return stopSnapshotWatching('nodeDrag');
  }, [stopSnapshotWatching]);

  const handleOnNodesChange = useCallback(
    (changes: NodeChange<WorkflowBuilderNode>[]) => {
      processSnapshotWatching('nodeDrag');
      callNodeChangedListeners(changes);
      onNodesChange(changes);
    },
    [processSnapshotWatching, onNodesChange],
  );

  const handleOnSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      onSelectionChange(params as WorkflowBuilderOnSelectionChangeParams);
    },
    [onSelectionChange],
  );

  useEffect(() => destroyNodeChangedListeners(), []);

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
            takeSnapshot();
            resolve(true);
          },
          onModalClosed: () => resolve(false),
        });
      });
    },
    [isReadOnlyMode, openDeleteConfirmationModal, takeSnapshot],
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
        <Watermark />
      </ReactFlow>
    </div>
  );
}

export const DiagramContainer = withOptionalPlugins(DiagramContainerComponent, 'DiagramContainer');

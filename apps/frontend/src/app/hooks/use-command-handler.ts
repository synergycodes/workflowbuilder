import { useCallback, useContext, useState } from 'react';
import { useOnSelectionChange, useStoreApi } from '@xyflow/react';
import useStore from '@/store/store';
import { MousePositionContext } from '@/providers/mouse-position-provider';
import { UndoRedoContext } from '@/providers/undo-redo-provider';
import { WorkflowBuilderNode, WorkflowBuilderEdge } from '@workflow-builder/types/node-data';
import { WorkflowBuilderOnSelectionChangeParams } from '@workflow-builder/types/common';

export type CommandHandler = {
  copy: () => void;
  cut: () => void;
  paste: () => void;
  selectAll: () => void;
  undo: () => void;
  redo: () => void;
};

function clearNodeSpecificProps(selection: WorkflowBuilderOnSelectionChangeParams | undefined) {
  if (selection) {
    const clonedSelection = structuredClone(selection);

    for (const node of clonedSelection.nodes) {
      node.parentId = undefined;
    }

    return clonedSelection;
  }
  return selection;
}

export function useCommandHandler(isReadOnlyMode: boolean): CommandHandler {
  const [clipboard, setClipboard] = useState<{
    nodes: WorkflowBuilderNode[];
    edges: WorkflowBuilderEdge[];
  }>();
  const [selection, setSelection] = useState<WorkflowBuilderOnSelectionChangeParams>();
  const { getCurrentMousePosition } = useContext(MousePositionContext);
  const { undo, redo, takeSnapshot } = useContext(UndoRedoContext);
  const reactFlowStore = useStoreApi();

  useOnSelectionChange({
    onChange: (change) => setSelection(change as WorkflowBuilderOnSelectionChangeParams),
  });

  const pasteElements = useStore((state) => state.pasteElements);
  const removeElements = useStore((state) => state.removeElements);

  const copy = useCallback(() => {
    setClipboard(clearNodeSpecificProps(selection));
  }, [selection, setClipboard]);

  const cut = useCallback(() => {
    setClipboard(selection);
    if (selection && !isReadOnlyMode) {
      takeSnapshot();
      removeElements(selection);
    }
  }, [selection, isReadOnlyMode, takeSnapshot, removeElements]);

  const paste = useCallback(() => {
    if (clipboard && !isReadOnlyMode) {
      takeSnapshot();
      reactFlowStore.getState().resetSelectedElements();
      pasteElements(structuredClone(clipboard), getCurrentMousePosition());
    }
  }, [clipboard, isReadOnlyMode, takeSnapshot, pasteElements, getCurrentMousePosition, reactFlowStore]);

  const handleUndo = useCallback(() => {
    if (!isReadOnlyMode) {
      undo();
    }
  }, [isReadOnlyMode, undo]);

  const handleRedo = useCallback(() => {
    if (!isReadOnlyMode) {
      redo();
    }
  }, [isReadOnlyMode, redo]);

  const selectAll = useCallback(() => {
    const state = reactFlowStore.getState();
    state.addSelectedNodes(state.nodes.map((node) => node.id));
    state.addSelectedEdges(state.edges.map((edge) => edge.id));
  }, [reactFlowStore]);

  return {
    copy,
    cut,
    paste,
    selectAll,
    undo: handleUndo,
    redo: handleRedo,
  };
}

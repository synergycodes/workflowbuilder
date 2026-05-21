import type { Edge, Node } from '@xyflow/react';
import { useCallback, useState } from 'react';

import type { GetHandleId, Position, Selection } from '../types';
import { getSelectionWithNodesBetween } from '../utils/get-selection-with-nodes-between';
import { pasteElements } from '../utils/paste-elements';
import { removeElements } from '../utils/remove-elements';

type UseCopyPasteParams = {
  getSelection: () => Selection;
  getEdges: () => Edge[];
  getNodes: () => Node[];
  getHandleId: GetHandleId;
  shouldCopyEdgeBetween: boolean;
  resetSelectedElements: () => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  generateId: () => string;
};

/**
 * React hook for in-memory cut, copy, and paste of diagram elements.
 *
 * Provides copy, cut, and paste operations using an in-memory clipboard. Use this for fast, session-only operations.
 *
 * @param getSelection - Function to get the current selection of nodes and edges
 * @param getEdges - Function to get the current list of edges
 * @param getNodes - Function to get the current list of nodes
 * @param getHandleId - Function to generate a handle ID for pasted elements.
 * @param resetSelectedElements - Function to reset the current selection
 * @param shouldCopyEdgeBetween - Whether to include edges between selected nodes
 * @param setNodes - Function to set the list of nodes in the diagram.
 * @param setEdges - Function to set the list of edges in the diagram.
 * @param generateId - Function to generate unique IDs for pasted nodes/edges.
 *
 * @returns An object with copy, cut, and paste methods.
 * @see useExternalCopyPaste for browser clipboard support
 */
export const useCopyPaste = ({
  getSelection,
  getEdges,
  resetSelectedElements,
  shouldCopyEdgeBetween = true,
  getNodes,
  setNodes,
  setEdges,
  generateId,
  getHandleId,
}: UseCopyPasteParams) => {
  const [clipboard, setClipboard] = useState<Selection>();

  const handleGetSelection = useCallback(() => {
    let selection = getSelection();

    if (!selection) {
      console.warn('useCopyPaste: No selection');
      return;
    }

    if (shouldCopyEdgeBetween && selection.nodes.length > 1) {
      selection = getSelectionWithNodesBetween(selection, getEdges());
    }

    return selection;
  }, [getSelection, getEdges, shouldCopyEdgeBetween]);

  const copy = useCallback(() => {
    const selection = handleGetSelection();

    setClipboard(selection);

    return selection;
  }, [handleGetSelection]);

  const cut = useCallback(() => {
    const selection = copy();

    if (!selection) return;

    removeElements({
      elements: selection,
      getNodes,
      setNodes,
      getEdges,
      setEdges,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy]);

  const paste = useCallback(
    ({ mousePosition = { x: 0, y: 0 } }: { mousePosition?: Position } = {}) => {
      if (!clipboard) {
        console.warn('useCopyPaste: Clipboard is empty');

        return;
      }

      resetSelectedElements();

      pasteElements({
        elements: structuredClone(clipboard),
        mousePosition,
        getNodes,
        setNodes,
        getEdges,
        setEdges,
        generateId,
        getHandleId,
      });
    },
    [clipboard, resetSelectedElements, getNodes, getEdges, setNodes, setEdges, generateId, getHandleId],
  );

  return {
    copy,
    cut,
    paste,
  };
};

import type { Edge, Node } from '@xyflow/react';
import { useCallback } from 'react';

import type { GetHandleId, Position, Selection } from '../types';
import { copyToClipboard } from '../utils/copy-to-clipboard';
import { getSelectionWithNodesBetween } from '../utils/get-selection-with-nodes-between';
import { pasteElements } from '../utils/paste-elements';
import { pasteFromClipboard } from '../utils/paste-from-clipboard';
import { removeElements } from '../utils/remove-elements';

type UseExternalCopyPasteParams = {
  getSelection: () => Selection;
  getEdges: () => Edge[];
  getNodes: () => Node[];
  getHandleId: GetHandleId;
  resetSelectedElements: () => void;
  shouldCopyEdgeBetween?: boolean;
  onError?: (error: Error) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  generateId: () => string;
};

/**
 * React hook for cut, copy, and paste using the browser Clipboard API (system-wide).
 *
 * Allows cross-tab and cross-app clipboard operations using the browser's clipboard. Use this for interoperability with other browser tabs or applications.
 *
 * @param getSelection - Function to get the current selection of nodes and edges
 * @param getEdges - Function to get the current list of edges
 * @param getNodes - Function to get the current list of nodes
 * @param resetSelectedElements - Function to reset the current selection
 * @param shouldCopyEdgeBetween - Whether to include edges between selected nodes (default: true)
 * @param onError - Optional error handler for clipboard operations
 * @param setNodes - Function to set the list of nodes in the diagram.
 * @param setEdges - Function to set the list of edges in the diagram.
 * @param generateId - Function to generate unique IDs for pasted nodes/edges.

 * @returns An object with async copy, cut, and paste methods
 * @see useCopyPaste for in-memory clipboard support
 */
export const useExternalCopyPaste = ({
  getSelection,
  getEdges,
  resetSelectedElements,
  shouldCopyEdgeBetween = true,
  onError,
  getNodes,
  setNodes,
  setEdges,
  generateId,
  getHandleId,
}: UseExternalCopyPasteParams) => {
  const handleGetSelection = useCallback(() => {
    let selection = getSelection();

    if (!selection) {
      console.warn('useExternalCopyPaste: No selection');

      return;
    }

    if (shouldCopyEdgeBetween && selection.nodes.length > 1) {
      selection = getSelectionWithNodesBetween(selection, getEdges());
    }

    return selection;
  }, [getSelection, getEdges, shouldCopyEdgeBetween]);

  const copy = useCallback(async () => {
    try {
      const selection = handleGetSelection();

      if (!selection) return;

      await copyToClipboard(selection);

      return selection;
    } catch (error) {
      onError?.(error as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGetSelection]);

  const cut = useCallback(async () => {
    try {
      const selection = await copy();

      if (!selection) return;

      removeElements({
        elements: selection,
        getNodes,
        setNodes,
        getEdges,
        setEdges,
      });
    } catch (error) {
      onError?.(error as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleGetSelection]);

  const paste = async ({ mousePosition = { x: 0, y: 0 } }: { mousePosition?: Position } = {}) => {
    try {
      const object = (await pasteFromClipboard()) as Selection;

      if (!object || !Array.isArray(object.edges) || !Array.isArray(object.nodes)) {
        throw new Error('useExternalCopyPaste: Invalid format of pasted value');
      }

      resetSelectedElements();

      pasteElements({
        elements: object,
        mousePosition,
        getNodes,
        setNodes,
        getEdges,
        setEdges,
        generateId,
        getHandleId,
      });

      resetSelectedElements();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return {
    copy,
    cut,
    paste,
  };
};

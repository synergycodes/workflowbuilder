import {
  getStoreEdges,
  getStoreNodes,
  getStoreSelection,
  resetStoreSelection,
  trackFutureChange,
} from '@workflowbuilder/sdk';
import { useReactFlow } from '@xyflow/react';
import { type ReactNode, useCallback } from 'react';

import { type GetHandleId, useCopyPasteKeyboardHandler, useExternalCopyPaste, useFlowMousePosition } from '../libs';

type CopyPasteProviderProps = {
  children: ReactNode;
};

function generateId() {
  return crypto.randomUUID();
}

const getHandleIdForCopyPaste: GetHandleId = (params) => {
  if (!params.oldHandleId) {
    return null;
  }

  return params.oldHandleId.replace(params.oldNodeId, params.newNodeId);
};

function CopyPasteProviderComponent({ children }: CopyPasteProviderProps) {
  const getFlowMousePosition = useFlowMousePosition();

  const { setNodes, setEdges } = useReactFlow();

  const { cut, copy, paste } = useExternalCopyPaste({
    getSelection: getStoreSelection,
    getEdges: getStoreEdges,
    resetSelectedElements: resetStoreSelection,
    shouldCopyEdgeBetween: true,
    getNodes: getStoreNodes,
    setNodes,
    setEdges,
    generateId,
    getHandleId: getHandleIdForCopyPaste,
  });

  const handleCut = useCallback(() => {
    const selection = getStoreSelection();

    if (selection) {
      trackFutureChange('cut');
      cut();
    }
  }, [cut]);

  const handlePaste = useCallback(async () => {
    const text = await navigator.clipboard.readText();

    if (text) {
      trackFutureChange('paste');
      paste({ mousePosition: getFlowMousePosition().flow });
    }
  }, [getFlowMousePosition, paste]);

  useCopyPasteKeyboardHandler({
    handleCut,
    handleCopy: copy,
    handlePaste,
  });

  return children;
}

export const CopyPasteProvider = CopyPasteProviderComponent;

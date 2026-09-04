import { type XYPosition, useStoreApi } from '@xyflow/react';
import { type DragEvent, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

import { getCustomNodeTemplates } from '../../../data/node-templates';
import { useTranslateIfPossible } from '../../../hooks/use-translate-if-possible';
import type { BaseNodeProperties } from '../../../node/node-schema';
import { NodeType } from '../../../node/node-types';
import { useStore } from '../../../store/store';
import { generateId } from '../../../utils/generate-id';
import { getNodeAddChange } from '../../../utils/get-node-add-change';
import { resolveReactFlowNodeType } from '../../../utils/resolve-react-flow-node-type';
import { trackFutureChange } from '../../changes-tracker/stores/use-changes-tracker-store';
import { getDraggedItemAction, setDraggedItem } from '../stores/use-palette-store';

export function usePaletteDrop() {
  const resetSelectedElements = useStoreApi().getState().resetSelectedElements;
  const [reactFlowInstance, onNodesChange, getNodeDefinition] = useStore(
    useShallow((store) => [store.reactFlowInstance, store.onNodesChange, store.getNodeDefinition]),
  );

  const translateIfPossible = useTranslateIfPossible();

  const dropNode = useCallback(
    (position: XYPosition | undefined, nodeType: string) => {
      const nodeDefinition = getNodeDefinition(nodeType);
      if (!nodeDefinition) {
        return;
      }

      const { defaultPropertiesData, type, icon, templateType = NodeType.Node, isStartNode } = nodeDefinition;
      const defaultProps = defaultPropertiesData as BaseNodeProperties;

      const label =
        translateIfPossible(defaultProps.label) || translateIfPossible(nodeDefinition.label) || nodeDefinition.label;

      const description =
        translateIfPossible(defaultProps.description) ||
        translateIfPossible(nodeDefinition.description) ||
        nodeDefinition.description;

      const data = {
        properties: { ...defaultPropertiesData, label, description },
        type,
        icon,
        ...(isStartNode ? { isStartNode: true } : {}),
      };

      const reactFlowNodeType = resolveReactFlowNodeType(type, templateType, getCustomNodeTemplates());

      const newNodeId = generateId();
      trackFutureChange('addNode', { nodeType: type });
      resetSelectedElements();
      onNodesChange(getNodeAddChange(reactFlowNodeType, position, data, newNodeId));
    },
    [getNodeDefinition, translateIfPossible, resetSelectedElements, onNodesChange],
  );

  const onDropFromPalette = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const draggedItem = getDraggedItemAction();

      if (!draggedItem) {
        return;
      }

      const { type } = draggedItem;

      setDraggedItem(null);
      dropNode(position, type);
    },
    [reactFlowInstance, dropNode],
  );

  return { onDropFromPalette };
}

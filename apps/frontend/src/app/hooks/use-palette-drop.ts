import { useShallow } from 'zustand/shallow';
import { DragEvent, useCallback } from 'react';
import { useStoreApi, XYPosition } from '@xyflow/react';
import useStore from '@/store/store';
import { DraggingItem } from '@workflow-builder/types/common';
import { getNodeAddChange } from '@/utils/get-node-add-change';
import { dataFormat } from '@/utils/consts';
import { useTranslateIfPossible } from './use-translate-if-possible';
import { NodeType } from '../../../../types/src/node-types';
import { BaseNodeProperties } from '../../../../types/src/node-schema';

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

      const { defaultPropertiesData, type, icon, templateType = NodeType.Node } = nodeDefinition;
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
      };

      const newNodeId = crypto.randomUUID();
      resetSelectedElements();
      onNodesChange(getNodeAddChange(templateType, position, data, newNodeId));
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

      const json = event.dataTransfer?.getData(dataFormat);
      if (!json) return;

      const draggingItem = JSON.parse(json) as DraggingItem;
      const { type } = draggingItem;

      dropNode(position, type);
    },
    [reactFlowInstance, dropNode],
  );

  return { onDropFromPalette };
}

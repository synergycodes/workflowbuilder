import { type XYPosition, useStoreApi } from '@xyflow/react';
import { type DragEvent, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';

import { getCustomNodeTemplates } from '../data/node-templates';
import { trackFutureChange } from '../features/changes-tracker/stores/use-changes-tracker-store';
import type { DraggingItem } from '../node/common';
import type { BaseNodeProperties } from '../node/node-schema';
import { NodeType } from '../node/node-types';
import { useStore } from '../store/store';
import { dataFormat } from '../utils/consts';
import { getNodeAddChange } from '../utils/get-node-add-change';
import { resolveReactFlowNodeType } from '../utils/resolve-react-flow-node-type';
import { useTranslateIfPossible } from './use-translate-if-possible';

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

      const reactFlowNodeType = resolveReactFlowNodeType(type, templateType, getCustomNodeTemplates());

      const newNodeId = crypto.randomUUID();
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

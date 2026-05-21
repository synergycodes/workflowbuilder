import type { WBIcon } from '@workflow-builder/icons';

import { getStoreNodes } from '../../../store/slices/diagram-slice/actions';
import { VARIABLE_BRACKETS_START, VARIABLE_GLOBAL_KEY, VARIABLE_NODES_KEY } from '../constants';

type NodeWithVariable = {
  id: string;
  icon: WBIcon;
  title?: string;
};

// This is very expensive operation call it only inside a callback that is trigger by user action
export function getNodesWithVariable(variableKey: string): NodeWithVariable[] {
  const isSupportedVariable = [VARIABLE_GLOBAL_KEY, VARIABLE_NODES_KEY].some((key) =>
    variableKey.startsWith(`${VARIABLE_BRACKETS_START}${key}`),
  );

  if (!isSupportedVariable) {
    console.error(`Unsupported variable for getNodesIdsWithVariable: ${variableKey}`);

    return [];
  }

  const nodes = getStoreNodes();

  const nodesWithVariables = nodes
    .filter((node) => {
      return JSON.stringify(node.data.properties).includes(variableKey);
    })
    .map((node) => ({
      id: node.id,
      icon: node.data.icon,
      title: node.data.properties.label,
    }));

  return nodesWithVariables;
}

import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { useStore } from '../../../../store/store';
import { getNodeDefinition } from '../../../../utils/validation/get-node-definition';
import { getNodeLabelForVariable } from '../../utils/diagram/get-node-label-for-variable';
import {
  type VariablesSuggestionsStore,
  emptyVariablesSuggestionsStore,
  useVariablesSuggestionsStore,
} from '../use-variable-suggestions-store';
import { getSuggestionsNodeData } from './get-suggestions-node-data/get-suggestions-node-data';
import { setVariablesSuggestionsNodeData } from './set-suggestions-node-data/set-suggestions-node-data';

function refreshNodesSuggestions(nodes: WorkflowBuilderNode[], initialStore: VariablesSuggestionsStore) {
  let currentStore = initialStore;

  for (const node of nodes) {
    const definition = getNodeDefinition(node);

    if (definition) {
      const nodeLabel = getNodeLabelForVariable({ node, definition });
      const { type, bySourceHandle } = getSuggestionsNodeData({ node, definition });

      currentStore = setVariablesSuggestionsNodeData({
        type,
        nodeId: node.id,
        nodeType: node.data.type,
        nodeLabel,
        bySourceHandle,
        cachedStore: currentStore,
        shouldOnlyPassedStore: true,
      });
    }
  }

  useVariablesSuggestionsStore.setState(currentStore);
}

export function refreshAllSuggestions() {
  const { nodes } = useStore.getState();

  refreshNodesSuggestions(nodes, { ...emptyVariablesSuggestionsStore });
}

export function refreshNodesIdsSuggestions(nodesIds: string[]) {
  const currentStore = useVariablesSuggestionsStore.getState();
  const { nodes } = useStore.getState();

  const nodesToRefresh = nodes.filter((node) => nodesIds.includes(node.id));

  refreshNodesSuggestions(nodesToRefresh, currentStore);
}

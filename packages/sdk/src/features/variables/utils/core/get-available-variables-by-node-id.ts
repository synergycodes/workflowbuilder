import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import type { VariableType } from '../../../../node/node-output-schema';
import { getNodeDefinition } from '../../../../utils/validation/get-node-definition';
import type { VariableSuggestionGroup } from '../../components/variable-text/variable-text.types';
import { getNodeVariablesSuggestions } from '../../stores/core/get-node-variables-suggestions';
import { useVariablesSuggestionsStore } from '../../stores/use-variable-suggestions-store';
import { getNodeAncestors } from '../diagram/get-node-ancestors';
import { getNodeLabelForVariable } from '../diagram/get-node-label-for-variable';
import { filterSuggestionsByTypes } from './filter-suggestions-by-types';

type Params = {
  nodeId: string | undefined;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  excludeTypes: VariableType[];
  includeTypes: VariableType[];
};

// Returns variables available for nodes as a result of edges connected to their target nodes
export function getAvailableVariablesByNodeId({
  nodeId,
  nodes,
  edges,
  excludeTypes,
  includeTypes,
}: Params): VariableSuggestionGroup[] {
  if (!nodeId) {
    return [];
  }

  const variableSuggestionsStore = useVariablesSuggestionsStore.getState();

  // BFS backward through edges to find all ancestor nodes
  const ancestors = getNodeAncestors(nodeId, edges);

  const groups: VariableSuggestionGroup[] = [];

  for (const ancestor of ancestors) {
    // Source handle is important because source handle from Source named error and success should returns different variables
    const { source: nodeId, sourceHandle } = ancestor;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      continue;
    }

    const definition = getNodeDefinition(node);
    if (!definition?.outputSchema) {
      continue;
    }

    const nodeLabel = getNodeLabelForVariable({ node, definition });

    const suggestions =
      getNodeVariablesSuggestions({
        nodeId,
        sourceHandle,
        cachedStore: variableSuggestionsStore,
      }) || [];

    const filteredSuggestions = filterSuggestionsByTypes({
      suggestions,
      excludeTypes,
      includeTypes,
    });

    if (filteredSuggestions.length > 0) {
      groups.push({
        label: nodeLabel,
        icon: node.data.icon,
        suggestions: filteredSuggestions,
      });
    }
  }

  return groups;
}

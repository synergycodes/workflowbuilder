import type { VariableType } from '@workflow-builder/types/variables/variables';

import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import { getNodeDefinition } from '../../../../utils/validation/get-node-definition';
import type { VariableSuggestionGroup } from '../../components/variable-text/variable-text.types';
import { getNodeVariablesSuggestions } from '../../stores/core/get-node-variables-suggestions';
import { useVariablesSuggestionsStore } from '../../stores/use-variable-suggestions-store';
import { getNodeAncestors } from '../diagram/get-node-ancestors';
import { getNodeLabelForVariable } from '../diagram/get-node-label-for-variable';
import { filterSuggestionsByTypes } from './filter-suggestions-by-types';
import { filterSuggestionsDuplicates } from './filter-suggestions-duplicates';

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

  const ancestors = getNodeAncestors(nodeId, edges);

  const groupsByNodeId: {
    [nodeId: string]: VariableSuggestionGroup;
  } = {};
  // react-mentions-ts splits groups by label, so two nodes sharing one would merge into a single group
  const usedLabels = new Set<string>();

  for (const ancestor of ancestors) {
    // Source handle is important because source handle from Source named error and success should returns different variables
    const { source: nodeId, sourceHandle } = ancestor;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      continue;
    }

    const definition = getNodeDefinition(node);
    if (!definition?.schemaOutput && !definition?.outputSchema) {
      continue;
    }

    const nodeLabel =
      groupsByNodeId[nodeId]?.label ?? uniqueLabel(getNodeLabelForVariable({ node, definition }), usedLabels);

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

    const uniqueSuggestions = groupsByNodeId[nodeId]?.suggestions
      ? filterSuggestionsDuplicates([...groupsByNodeId[nodeId].suggestions, ...filteredSuggestions])
      : filteredSuggestions;

    groupsByNodeId[nodeId] = {
      label: nodeLabel,
      icon: node.data.icon,
      suggestions: uniqueSuggestions,
    };
  }

  return Object.values(groupsByNodeId);
}

// Two ancestors with the same label become "Fetch", "Fetch (2)", "Fetch (3)"
function uniqueLabel(label: string, usedLabels: Set<string>): string {
  let candidate = label;
  for (let n = 2; usedLabels.has(candidate); n++) {
    candidate = `${label} (${n})`;
  }
  usedLabels.add(candidate);
  return candidate;
}

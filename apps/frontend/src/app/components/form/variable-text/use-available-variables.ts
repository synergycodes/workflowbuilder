import { useMemo } from 'react';

import { getNodesDefinitionsByType } from '@/utils/validation/get-nodes-definitions-by-type';

import { getStoreEdges, getStoreNodes, getStoreSingleSelected } from '@/store/slices/diagram-slice/actions';
import useStore from '@/store/store';

import { VariableSuggestionGroup } from '@/components/form/variable-text/variable-text.types';

import { VARIABLE_NODES_KEY } from './constants';

export function useAvailableVariables(): VariableSuggestionGroup[] {
  const nodes = getStoreNodes();
  const edges = getStoreEdges();
  const selected = getStoreSingleSelected();

  return useMemo(() => {
    const currentNodeId = selected?.node?.id;
    if (!currentNodeId) return [];

    // BFS backward through edges to find all ancestor nodes
    const ancestors = new Set<string>();
    const queue = [currentNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      for (const edge of edges) {
        if (edge.target === nodeId && !ancestors.has(edge.source)) {
          ancestors.add(edge.source);
          queue.push(edge.source);
        }
      }
    }

    const data = useStore.getState().data;
    const definitionsByType = getNodesDefinitionsByType(data);
    const groups: VariableSuggestionGroup[] = [];

    for (const ancestorId of ancestors) {
      const node = nodes.find((n) => n.id === ancestorId);
      if (!node) continue;

      const definition = definitionsByType[node.data.type];
      if (!definition?.outputSchema) continue;

      const nodeLabel = (node.data.properties as { label?: string }).label || definition.label || node.data.type;

      const suggestions = Object.entries(definition.outputSchema.properties).map(([propertyKey, property]) => ({
        id: `${VARIABLE_NODES_KEY}.${ancestorId}.${propertyKey}`,
        display: `${nodeLabel} · ${property.label}`,
        propertyLabel: property.label,
        description: property.description,
      }));

      groups.push({
        nodeLabel,
        nodeIcon: node.data.icon,
        suggestions,
      });
    }

    return groups;
  }, [nodes, edges, selected]);
}

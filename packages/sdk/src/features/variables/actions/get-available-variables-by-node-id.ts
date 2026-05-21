import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../node/node-data';
import { OUTPUT_SCHEMA_TYPE } from '../../../node/node-output-schema';
import { useStore } from '../../../store/store';
import { getNodesDefinitionsByType } from '../../../utils/validation/get-nodes-definitions-by-type';
import type { VariableSuggestion, VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { getNodeSuggestionsFromOutputProperties } from '../utils/get-node-suggestions-from-output-properties';

type Params = {
  nodeId: string | undefined;
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  excludeTypes?: string[];
};

export function getAvailableVariablesByNodeId({
  nodeId,
  nodes,
  edges,
  excludeTypes = [],
}: Params): VariableSuggestionGroup[] {
  if (!nodeId) {
    return [];
  }

  // BFS backward through edges to find all ancestor nodes
  const ancestors = new Set<string>();
  const queue = [nodeId];

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
    if (!node) {
      continue;
    }

    const definition = definitionsByType[node.data.type];
    if (!definition?.outputSchema) {
      continue;
    }

    const nodeLabel = (node.data.properties as { label?: string }).label || definition.label || node.data.type;

    let suggestions: VariableSuggestion[] = [];

    if (definition.outputSchema.type === OUTPUT_SCHEMA_TYPE.DEFAULT) {
      suggestions = getNodeSuggestionsFromOutputProperties({
        properties: definition.outputSchema.properties,
        nodeLabel,
        nodeId: ancestorId,
        excludeTypes,
      });
    }

    if (definition.outputSchema.type === OUTPUT_SCHEMA_TYPE.VARIANT) {
      const variant = Object.values(definition.outputSchema.variants).find((variant) => {
        if (!variant?.variantRule) {
          return true;
        }

        const { dataPropertyName, dataPropertyValue } = variant.variantRule;

        if (node.data.properties[dataPropertyName] === dataPropertyValue) {
          return true;
        }

        return false;
      });

      if (variant) {
        suggestions = getNodeSuggestionsFromOutputProperties({
          properties: variant.properties,
          nodeLabel,
          nodeId: ancestorId,
          excludeTypes,
        });
      }
    }

    groups.push({
      label: nodeLabel,
      icon: node.data.icon,
      suggestions,
    });
  }

  return groups;
}

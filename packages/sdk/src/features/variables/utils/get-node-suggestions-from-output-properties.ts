import type { OutputProperty } from '../../../node/node-output-schema';
import { truncate } from '../../../utils/text';
import type { VariableSuggestion } from '../components/variable-text/variable-text.types';
import { VARIABLE_NODES_KEY } from '../constants';

type Params = {
  properties: Record<string, OutputProperty>;
  nodeId: string;
  nodeLabel: string;
  excludeTypes?: string[];
};

export const getNodeSuggestionsFromOutputProperties = ({
  properties,
  nodeId,
  nodeLabel,
  excludeTypes = [],
}: Params): VariableSuggestion[] => {
  const suggestions = Object.entries(properties).map(([propertyKey, property]) => ({
    id: `${VARIABLE_NODES_KEY}.${nodeId}.${propertyKey}`,
    display: `${truncate(nodeLabel, 15)} · ${truncate(property.label, 15)}`,
    label: property.label,
    description: property.description,
    type: property.type,
  }));

  if (excludeTypes.length === 0) {
    return suggestions;
  }

  return suggestions.filter(({ type }) => excludeTypes.includes(type) === false);
};

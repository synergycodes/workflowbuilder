import type { OutputPropertiesIndex } from '../../../../../node/node-output-schema';
import { filterEmpty } from '../../../../../utils/array';
import { keyToLabel, truncate } from '../../../../../utils/text';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { getVariableReferenceWithoutBracketsForNode } from '../../../utils/keys/get-variable-reference-without-brackets-for-node';

type Params = {
  properties: OutputPropertiesIndex;
  nodeId: string;
  nodeLabel: string;
};

/**
 * Produces a list of suggestions generated from `outputPropertiesIndex` (used by node definition variants).
 */
export function getSuggestionsFromOutputProperties({ nodeId, nodeLabel, properties }: Params): VariableSuggestion[] {
  return Object.entries(properties)
    .map(([propertyKey, property]) =>
      property
        ? {
            id: getVariableReferenceWithoutBracketsForNode({ nodeId, propertyName: propertyKey }),
            display: `${truncate(nodeLabel, 15)} · ${truncate(property.label || keyToLabel(propertyKey), 15)}`,
            label: property.label || truncate(property.label || keyToLabel(propertyKey), 25),
            description: property.description,
            type: property.type,
          }
        : undefined,
    )
    .filter(filterEmpty);
}

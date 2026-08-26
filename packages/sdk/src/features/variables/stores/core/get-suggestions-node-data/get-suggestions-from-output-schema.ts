import type { JsonSchema7 } from '@jsonforms/core';

import { filterEmpty } from '../../../../../utils/array';
import { keyToLabel, truncate } from '../../../../../utils/text';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { getFlattenedPropertiesFromJsonSchema7 } from '../../../utils/json-schema/get-flattened-properties-from-json-schema-7';
import { getVariableReferenceWithoutBracketsForNode } from '../../../utils/keys/get-variable-reference-without-brackets-for-node';

type Params = {
  properties: JsonSchema7;
  nodeId: string;
  nodeLabel: string;
};

/**
 * Produces a list of suggestions generated from `outputPropertiesIndex` (used by node definition variants).
 */
export function getSuggestionsFromOutputSchema({ nodeId, nodeLabel, properties }: Params): VariableSuggestion[] {
  const flattenedProperties = getFlattenedPropertiesFromJsonSchema7(properties);

  return Object.entries(flattenedProperties)
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

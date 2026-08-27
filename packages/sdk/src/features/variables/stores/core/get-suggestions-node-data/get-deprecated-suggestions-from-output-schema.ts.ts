import type { FlattenedPropertiesIndex } from '../../../../../node/node-output-schema';
import { filterEmpty } from '../../../../../utils/array';
import { keyToLabel, truncate } from '../../../../../utils/text';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { getVariableReferenceWithoutBracketsForNode } from '../../../utils/keys/get-variable-reference-without-brackets-for-node';

type Params = {
  properties: FlattenedPropertiesIndex;
  nodeId: string;
  nodeLabel: string;
};

/**
 * Produces a list of suggestions generated from `FlattenedPropertiesIndex` (used by node outputProperties).
 *
 * @deprecated `outputSchema` is deprecated. Switch to `schemaOutput` instead.
 * The newer version uses a schema similar to the Node schema, but also supports handling responses
 * by source handle (the error port does not receive successful variables).
 *
 * `outputSchema` will be removed in the next major release (3.0).
 */
export function getDeprecatedSuggestionsFromOutputSchema({
  nodeId,
  nodeLabel,
  properties,
}: Params): VariableSuggestion[] {
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

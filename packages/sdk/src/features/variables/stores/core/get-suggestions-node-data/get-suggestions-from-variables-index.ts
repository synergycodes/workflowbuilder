import { filterEmpty } from '../../../../../utils/array';
import { truncate } from '../../../../../utils/text';
import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { VARIABLE_DELIMITER } from '../../../constants';
import type { VariablesIndex } from '../../../types';
import { getVariableReferenceWithoutBracketsForGlobal } from '../../../utils/keys/get-variable-reference-without-brackets-for-global';
import { getVariableReferenceWithoutBracketsForNode } from '../../../utils/keys/get-variable-reference-without-brackets-for-node';

type ParamsShared = {
  variablesIndex: VariablesIndex;
};

type ParamsForGlobal = {
  variant: 'global';
} & ParamsShared;

type ParamsForNode = {
  variant: 'nodes';
  nodeId: string;
  nodeLabel: string;
} & ParamsShared;

type Params = ParamsForGlobal | ParamsForNode;

/**
 * Produces a list of suggestions generated from `variablesIndex` (used by global variables and the build schema control).
 */
export const getSuggestionsFromVariableIndex = ({ variablesIndex, ...props }: Params): VariableSuggestion[] => {
  const suggestions: VariableSuggestion[] = Object.values(variablesIndex)
    .filter(filterEmpty)
    .map((definition) => {
      return props.variant === 'global'
        ? {
            id: getVariableReferenceWithoutBracketsForGlobal(definition.id),
            display: truncate(definition.name, 25),
            label: definition.name,
            description: definition.description,
            type: definition.type,
          }
        : {
            id: getVariableReferenceWithoutBracketsForNode({ nodeId: props.nodeId, propertyName: definition.id }),
            display: [truncate(props.nodeLabel, 15), truncate(definition.name, 15)]
              .filter(Boolean)
              .join(VARIABLE_DELIMITER),
            label: definition.name,
            description: definition.description,
            type: definition.type,
          };
    });

  return suggestions;
};

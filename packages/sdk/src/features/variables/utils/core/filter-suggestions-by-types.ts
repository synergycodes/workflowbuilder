import type { VariableType } from '@workflow-builder/types/node-output-schema';

import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';

type Params = {
  suggestions: VariableSuggestion[];
  excludeTypes: VariableType[];
  // It accepts all if the array is empty or undefined.
  includeTypes: VariableType[] | undefined;
};

export function filterSuggestionsByTypes({ suggestions, excludeTypes, includeTypes = [] }: Params) {
  return suggestions.filter(({ type }) => {
    if (excludeTypes.includes(type) === true) {
      return false;
    }

    if (includeTypes.length > 0 && includeTypes.includes(type) === false) {
      return false;
    }

    return true;
  });
}

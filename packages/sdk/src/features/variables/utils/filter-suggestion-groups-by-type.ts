import type { VariableType } from '../../../node/node-output-schema';
import { typesForDate } from '../components/dynamic-typed-input/constants';
import type { VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { getIsDateType } from './get-is-date-type';

export function filterSuggestionGroupsByType(
  suggestionGroups: VariableSuggestionGroup[],
  types: VariableType[],
): VariableSuggestionGroup[] {
  let typesToMatch = types;

  /*
    If we pick a date, we should be able to compare it with a datetime (a date with time).
  */
  const hasDateType = typesToMatch.some(getIsDateType);
  if (hasDateType) {
    typesToMatch = [...typesForDate, ...typesToMatch.filter((type) => !getIsDateType(type))];
  }

  return suggestionGroups
    .map((group) => ({
      ...group,
      suggestions: group.suggestions.filter((suggestion) => typesToMatch.includes(suggestion.type)),
    }))
    .filter((group) => group.suggestions.length > 0);
}

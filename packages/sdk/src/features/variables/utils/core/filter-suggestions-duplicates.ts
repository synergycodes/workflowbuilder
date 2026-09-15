import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';

export function filterSuggestionsDuplicates(suggestions: VariableSuggestion[]): VariableSuggestion[] {
  const suggestionsById = suggestions.reduce((stack: { [suggestionId: string]: VariableSuggestion }, suggestion) => {
    if (!stack[suggestion.id]) {
      stack[suggestion.id] = suggestion;
    }

    return stack;
  }, {});

  return Object.values(suggestionsById);
}

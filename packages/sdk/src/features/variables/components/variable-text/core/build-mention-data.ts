import type { VariableMentionData, VariableSuggestionGroup } from '../variable-text.types';

export function buildMentionData(groups: VariableSuggestionGroup[]): VariableMentionData[] {
  return groups.flatMap((group) =>
    group.suggestions.map((suggestion) => ({
      id: suggestion.id,
      display: `{{ ${suggestion.display} }}`,
      groupLabel: group.label,
      label: suggestion.label,
      description: suggestion.description,
      type: suggestion.type,
    })),
  );
}

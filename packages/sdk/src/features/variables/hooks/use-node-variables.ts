import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { VariableType } from '../../../node/node-output-schema';
import { useStore } from '../../../store/store';
import type { VariableSuggestion, VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { getSuggestionsFromVariableIndex } from '../stores/core/get-suggestions-node-data/get-suggestions-from-variables-index';
import { useVariablesSuggestionsStore } from '../stores/use-variable-suggestions-store';
import { filterSuggestionsByTypes } from '../utils/core/filter-suggestions-by-types';
import { getAvailableVariablesByNodeId } from '../utils/core/get-available-variables-by-node-id';

type Options = {
  excludeTypes?: VariableType[];
  includeTypes?: VariableType[];
};

type Response = {
  suggestionGroups: VariableSuggestionGroup[];
  totalVariables: number;
};

export function useNodeVariables(nodeId: string | undefined, options?: Options): Response {
  const { excludeTypes = [], includeTypes = [] } = options || {};
  const globalVariables = useStore((store) => store.globalVariables);
  const nodes = useStore((store) => store.nodes);
  const edges = useStore((store) => store.edges);
  const lastUpdateTimestamp = useVariablesSuggestionsStore((store) => store.lastUpdateTimestamp);
  const { t } = useTranslation();

  const globalSuggestionsGroups = useMemo(() => {
    const suggestions: VariableSuggestion[] = getSuggestionsFromVariableIndex({
      variablesIndex: globalVariables,
      variant: 'global',
    });

    const filteredSuggestions = filterSuggestionsByTypes({
      suggestions,
      excludeTypes,
      includeTypes,
    });

    if (filteredSuggestions.length > 0) {
      const globalGroup: VariableSuggestionGroup = {
        label: t('workflowsSettings.tab.globalVariables'),
        icon: 'Gear',
        suggestions: filteredSuggestions,
      };

      return [globalGroup];
    }

    return [];
  }, [excludeTypes, globalVariables, includeTypes, t]);

  const nodeSuggestionsGroups = useMemo(() => {
    return getAvailableVariablesByNodeId({
      nodeId,
      nodes,
      edges,
      excludeTypes,
      includeTypes,
    });

    // Variables can’t change while the modal containing them is in use, so we only need to refresh them when they change.
    // .length is critical here for performance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdateTimestamp, nodeId, excludeTypes, includeTypes, edges.length, nodes.length]);

  return useMemo(() => {
    const suggestionGroups = [...globalSuggestionsGroups, ...nodeSuggestionsGroups];
    const totalVariables = suggestionGroups.reduce((stack: number, group) => {
      stack += group.suggestions.length;

      return stack;
    }, 0);

    return {
      suggestionGroups,
      totalVariables,
    };
  }, [globalSuggestionsGroups, nodeSuggestionsGroups]);
}

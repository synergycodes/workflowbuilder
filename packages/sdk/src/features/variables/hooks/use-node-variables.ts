import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { VariableType } from '../../../node/node-output-schema';
import { useStore } from '../../../store/store';
import type { VariableSuggestion, VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { VARIABLES_TYPES_EMPTY } from '../constants';
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
  variablesKey: string;
};

export function useNodeVariables(nodeId: string | undefined, options?: Options): Response {
  const { excludeTypes = VARIABLES_TYPES_EMPTY, includeTypes = VARIABLES_TYPES_EMPTY } = options || {};
  const globalVariables = useStore((store) => store.globalVariables);
  const nodes = useStore((store) => store.nodes);
  const edges = useStore((store) => store.edges);
  const lastUpdateIndex = useVariablesSuggestionsStore((store) => store.lastUpdateIndex);
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

    // .length is critical here for performance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdateIndex, nodeId, edges.length, nodes.length]);

  return useMemo(() => {
    const suggestionGroups = [...globalSuggestionsGroups, ...nodeSuggestionsGroups];
    const { totalVariables, variablesKey } = suggestionGroups.reduce(
      (stack: Omit<Response, 'suggestionGroups'>, group) => {
        stack.totalVariables += group.suggestions.length;
        for (const suggestion of group.suggestions) {
          stack.variablesKey += `-${suggestion.id}`;
        }

        return stack;
      },
      {
        totalVariables: 0,
        variablesKey: 'vars',
      },
    );

    return {
      suggestionGroups,
      totalVariables,
      variablesKey,
    };
  }, [globalSuggestionsGroups, nodeSuggestionsGroups]);
}

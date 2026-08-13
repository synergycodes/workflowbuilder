import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { VariableType } from '../../../node/node-output-schema';
import { useStore } from '../../../store/store';
import type { VariableSuggestion, VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { getSuggestionsFromVariableIndex } from '../stores/core/get-suggestions-node-data/get-suggestions-from-variables-index';
import { filterSuggestionsByTypes } from '../utils/core/filter-suggestions-by-types';
import { getAvailableVariablesByNodeId } from '../utils/core/get-available-variables-by-node-id';

type Options = {
  excludeTypes?: VariableType[];
  includeTypes?: VariableType[];
};

export function useAvailableVariables(nodeId: string | undefined, options?: Options): VariableSuggestionGroup[] {
  const { excludeTypes = [], includeTypes = [] } = options || {};
  const globalVariables = useStore((store) => store.globalVariables);
  const nodes = useStore((store) => store.nodes);
  const edges = useStore((store) => store.edges);

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
  }, [nodeId, edges.length, nodes.length]);

  return useMemo(() => {
    return [...globalSuggestionsGroups, ...nodeSuggestionsGroups];
  }, [globalSuggestionsGroups, nodeSuggestionsGroups]);
}

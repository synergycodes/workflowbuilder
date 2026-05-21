import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../../store/store';
import { filterEmpty } from '../../../utils/array';
import { truncate } from '../../../utils/text';
import { getAvailableVariablesByNodeId } from '../actions/get-available-variables-by-node-id';
import type { VariableSuggestion, VariableSuggestionGroup } from '../components/variable-text/variable-text.types';
import { getGlobalVariableKey } from '../utils/get-global-variable-key';

export function useAvailableVariables(
  nodeId: string | undefined,
  excludeTypes: string[] = [],
): VariableSuggestionGroup[] {
  const globalVariables = useStore((store) => store.globalVariables);
  const nodes = useStore((store) => store.nodes);
  const edges = useStore((store) => store.edges);

  const { t } = useTranslation();

  const globalSuggestionsGroups = useMemo(() => {
    const suggestions: VariableSuggestion[] = Object.values(globalVariables)
      .filter(filterEmpty)
      .map((definition) => {
        return {
          id: getGlobalVariableKey(definition.id),
          display: truncate(definition.name, 25),
          label: definition.name,
          description: definition.description,
          type: definition.type,
        };
      });

    const globalGroup: VariableSuggestionGroup = {
      label: t('workflowsSettings.tab.globalVariables'),
      icon: 'Gear',
      suggestions,
    };

    return [globalGroup];
  }, [globalVariables, t]);

  const nodeSuggestionsGroups = useMemo(() => {
    return getAvailableVariablesByNodeId({
      nodeId,
      nodes,
      edges,
      excludeTypes,
    });

    // .length is critical here for performance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, edges.length, nodes.length]);

  return useMemo(() => {
    return [...globalSuggestionsGroups, ...nodeSuggestionsGroups];
  }, [globalSuggestionsGroups, nodeSuggestionsGroups]);
}

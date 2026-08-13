import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA } from '../../constants';
import { SUGGESTION_NODE_TYPE, type SuggestionsBySourceHandle } from '../types';
import { type VariablesSuggestionsStore, useVariablesSuggestionsStore } from '../use-variable-suggestions-store';

type UndefinedNotIndexed = undefined;

/**
 * General getter for all variables from a node, grouped by source handles.
 */
export const getVariableBySourceHandlesForNode = (params: {
  nodeId: string;
  cachedStore?: VariablesSuggestionsStore;
}): SuggestionsBySourceHandle | UndefinedNotIndexed => {
  // Pass the store if you want to call this function multiple times
  const store = params.cachedStore ?? useVariablesSuggestionsStore.getState();

  const nodeData = store.byNodeId[params.nodeId];

  // Not indexed
  if (!nodeData) {
    return undefined;
  }

  let bySourceHandle: SuggestionsBySourceHandle | undefined;

  if (nodeData.type === SUGGESTION_NODE_TYPE.CUSTOM) {
    bySourceHandle = nodeData.bySourceHandle;
  } else if (nodeData.type === SUGGESTION_NODE_TYPE.COMMON) {
    bySourceHandle = store.commonByType[nodeData.nodeType];
  }

  if (bySourceHandle) {
    return bySourceHandle;
  }

  // Not indexed
  return undefined;
};

/**
 * Getter for variables of the selected node available from the selected source handle.
 *
 * Pass a store if you want to call this function multiple times.
 */
export const getNodeVariablesSuggestions = (params: {
  nodeId: string;
  sourceHandle: string | undefined;
  cachedStore?: VariablesSuggestionsStore;
}): VariableSuggestion[] | UndefinedNotIndexed => {
  const bySourceHandle = getVariableBySourceHandlesForNode(params);

  // Not indexed
  if (!bySourceHandle) {
    return undefined;
  }

  let suggestions: VariableSuggestion[] | UndefinedNotIndexed = undefined;

  if (params.sourceHandle && Array.isArray(bySourceHandle[params.sourceHandle])) {
    suggestions = bySourceHandle[params.sourceHandle];
  }

  if (Array.isArray(bySourceHandle.default)) {
    suggestions = [...(suggestions || []), ...bySourceHandle.default];
  }

  // Some nodes (with the same type) have suggestions stored in shared place and need adjustment
  const hasPlaceholderIdToSwap = suggestions?.some((suggestion) =>
    suggestion.id.includes(NODE_ID_FOR_COMMON_NODE_DATA),
  );
  if (Array.isArray(suggestions) && hasPlaceholderIdToSwap) {
    return suggestions.map((suggestion) => ({
      ...suggestion,
      id: suggestion.id.replace(NODE_ID_FOR_COMMON_NODE_DATA, params.nodeId),
    }));
  }

  return suggestions;
};

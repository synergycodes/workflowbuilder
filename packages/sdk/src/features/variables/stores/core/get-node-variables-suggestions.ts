import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, SPECIAL_SOURCE_HANDLE_KEYWORDS } from '../../constants';
import { SUGGESTION_NODE_TYPE, type SuggestionsBySourceHandle } from '../types';
import { type VariablesSuggestionsStore, useVariablesSuggestionsStore } from '../use-variable-suggestions-store';

type UndefinedNotIndexed = undefined;

// General getter for all variables from a node, divided by source handles
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
    // Some nodes (with the same type) have suggestions stored in shared place and need adjustment
    bySourceHandle = Object.entries(store.commonByType[nodeData.nodeType] || {}).reduce(
      (stack: SuggestionsBySourceHandle, [sourceHandle, suggestions = []]) => {
        stack[sourceHandle] = suggestions.map((suggestion) => ({
          ...suggestion,
          id: suggestion.id.replace(NODE_ID_FOR_COMMON_NODE_DATA, params.nodeId),
        }));

        return stack;
      },
      {},
    );
  }

  if (bySourceHandle) {
    return bySourceHandle;
  }

  // Not indexed
  return undefined;
};

// Getter for variables of picked node available from picked sourceHandle
export const getNodeVariablesSuggestions = (params: {
  nodeId: string;
  sourceHandle: string | undefined;
  // Pass one store if you want to call it multiple times
  cachedStore?: VariablesSuggestionsStore;
}): VariableSuggestion[] | UndefinedNotIndexed => {
  const bySourceHandle = getVariableBySourceHandlesForNode(params);

  // Not indexed
  if (!bySourceHandle) {
    return undefined;
  }

  let suggestions: VariableSuggestion[] | UndefinedNotIndexed = undefined;

  const sourceHandle = params.sourceHandle || '';

  if (Array.isArray(bySourceHandle[sourceHandle])) {
    suggestions = bySourceHandle[sourceHandle];
  }

  const isErrorBranch = sourceHandle.includes(SPECIAL_SOURCE_HANDLE_KEYWORDS.ERROR);

  suggestions = [
    ...(suggestions || []),
    ...(bySourceHandle[SPECIAL_SOURCE_HANDLE_KEYWORDS.EVERY] || []),
    ...(bySourceHandle[isErrorBranch ? SPECIAL_SOURCE_HANDLE_KEYWORDS.ERROR : SPECIAL_SOURCE_HANDLE_KEYWORDS.SUCCESS] ||
      []),
  ];

  return suggestions;
};

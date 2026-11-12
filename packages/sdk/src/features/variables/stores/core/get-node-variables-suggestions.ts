import { truncate } from '../../../../utils/text';
import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, NODE_LABEL_FOR_COMMON_NODE_DATA } from '../../constants';
import { filterSuggestionsDuplicates } from '../../utils/core/filter-suggestions-duplicates';
import { type NodeVariablesSuggestions, SUGGESTION_NODE_TYPE } from '../types';
import { type VariablesSuggestionsStore, useVariablesSuggestionsStore } from '../use-variable-suggestions-store';

type UndefinedNotIndexed = undefined;

/** Swaps the `commonByType` placeholders in suggestion ids and displays for this node's id and label. */
function resolveCommonNodePlaceholders<T extends { [key: string]: VariableSuggestion[] | undefined }>(
  suggestionsByKey: T,
  node: { nodeId: string; nodeLabel: string },
): T {
  return Object.fromEntries(
    Object.entries(suggestionsByKey).map(([key, suggestions = []]) => [
      key,
      suggestions.map((suggestion) => ({
        ...suggestion,
        display: suggestion.display.replaceAll(NODE_LABEL_FOR_COMMON_NODE_DATA, truncate(node.nodeLabel, 15)),
        id: suggestion.id.replaceAll(NODE_ID_FOR_COMMON_NODE_DATA, node.nodeId),
      })),
    ]),
  ) as T;
}

/**
 * A node's suggestions by source handle and by source handle type.
 * Nodes without their own entry get the shared `commonByType` entry resolved to their id and label.
 */
export const getVariableBySourceHandlesForNode = (params: {
  nodeId: string;
  cachedStore?: VariablesSuggestionsStore;
}): NodeVariablesSuggestions | UndefinedNotIndexed => {
  // Pass the store if you want to call this function multiple times
  const store = params.cachedStore ?? useVariablesSuggestionsStore.getState();

  const nodeData = store.byNodeId[params.nodeId];

  if (!nodeData) {
    return undefined;
  }

  if (nodeData.type === SUGGESTION_NODE_TYPE.CUSTOM) {
    return { bySourceHandle: nodeData.bySourceHandle, bySourceHandleType: nodeData.bySourceHandleType };
  }

  // Some nodes (with the same type) have suggestions stored in shared place and need adjustment
  const commonSuggestions = store.commonByType[nodeData.nodeType];
  const node = { nodeId: params.nodeId, nodeLabel: nodeData.nodeLabel };

  return {
    bySourceHandle: resolveCommonNodePlaceholders(commonSuggestions?.bySourceHandle || {}, node),
    bySourceHandleType: resolveCommonNodePlaceholders(commonSuggestions?.bySourceHandleType || {}, node),
  };
};

/**
 * Suggestions reachable from one source handle of a node: the handle's own, the settled ones,
 * and the error or success ones depending on the handle. Undefined when the node is not indexed.
 */
export const getNodeVariablesSuggestions = (params: {
  nodeId: string;
  sourceHandle: string | undefined;
  // Pass one store if you want to call it multiple times
  cachedStore?: VariablesSuggestionsStore;
}): VariableSuggestion[] | UndefinedNotIndexed => {
  const nodeSuggestions = getVariableBySourceHandlesForNode(params);

  if (!nodeSuggestions) {
    return undefined;
  }

  const { bySourceHandle, bySourceHandleType } = nodeSuggestions;
  const sourceHandle = params.sourceHandle || '';
  // 'error' is the magic phrase used to determine whether
  // a branch represents an error or a successful execution.
  const isErrorBranch = sourceHandle.toLowerCase().includes('error');

  return filterSuggestionsDuplicates([
    ...(bySourceHandle[sourceHandle] || []),
    ...(bySourceHandleType['settled'] || []),
    ...(bySourceHandleType[isErrorBranch ? 'error' : 'success'] || []),
  ]);
};

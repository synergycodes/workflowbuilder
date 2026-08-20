import { NODE_ID_FOR_COMMON_NODE_DATA } from '../../../constants';
import type { SuggestionNodeType, SuggestionsBySourceHandle } from '../../types';
import { SUGGESTION_NODE_TYPE } from '../../types';
import type { VariablesSuggestionsStore } from '../../use-variable-suggestions-store';
import { useVariablesSuggestionsStore } from '../../use-variable-suggestions-store';

type ParamsShared = {
  type: SuggestionNodeType;
  nodeId: string;
  nodeType: string;
  bySourceHandle: SuggestionsBySourceHandle;
};

// If all variables are refreshed is worth batching them all and then setting the mutated store
type ParamsMutation = {
  cachedStore: VariablesSuggestionsStore;
  shouldOnlyPassedStore: true;
} & ParamsShared;

type ParamsUpdate = {
  cachedStore: undefined;
  shouldOnlyPassedStore?: false;
} & ParamsShared;

type Params = ParamsMutation | ParamsUpdate;

export function setVariablesSuggestionsNodeData(params: Params): VariablesSuggestionsStore {
  // Pass the store if you want to call this function multiple times
  let storeToMutate =
    params.shouldOnlyPassedStore === true ? params.cachedStore : useVariablesSuggestionsStore.getState();

  if (params.type === SUGGESTION_NODE_TYPE.COMMON) {
    storeToMutate = {
      ...storeToMutate,
      commonByType: {
        ...storeToMutate.commonByType,
        [params.nodeType]: Object.fromEntries(
          Object.entries(params.bySourceHandle).map(([sourceHandle, suggestions]) => [
            sourceHandle,
            suggestions?.map((suggestion) => ({
              ...suggestion,
              id: suggestion.id.replace(params.nodeId, NODE_ID_FOR_COMMON_NODE_DATA),
            })),
          ]),
        ) as SuggestionsBySourceHandle,
      },
      byNodeId: {
        ...storeToMutate.byNodeId,
        [params.nodeId]: {
          type: SUGGESTION_NODE_TYPE.COMMON,
          nodeType: params.nodeType,
        },
      },
    };
  } else if (params.type === SUGGESTION_NODE_TYPE.CUSTOM) {
    storeToMutate = {
      ...storeToMutate,
      byNodeId: {
        ...storeToMutate.byNodeId,
        [params.nodeId]: {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle: params.bySourceHandle,
        },
      },
    };
  }

  if (params.shouldOnlyPassedStore === false) {
    useVariablesSuggestionsStore.setState(storeToMutate);
  }

  return storeToMutate;
}

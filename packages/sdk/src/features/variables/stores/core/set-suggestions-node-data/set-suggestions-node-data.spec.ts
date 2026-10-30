import { beforeEach, describe, expect, it } from 'vitest';

import type { VariableSuggestion } from '../../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, NODE_LABEL_FOR_COMMON_NODE_DATA, VARIABLE_DELIMITER } from '../../../constants';
import { SUGGESTION_NODE_TYPE } from '../../types';
import { emptyVariablesSuggestionsStore, useVariablesSuggestionsStore } from '../../use-variable-suggestions-store';
import { setVariablesSuggestionsNodeData } from './set-suggestions-node-data';

const NODE_ID = 'node-1';
const NODE_TYPE = 'fetch';
const NODE_LABEL = 'My fetch';

function suggestion(key: string): VariableSuggestion {
  return {
    id: `nodes.${NODE_ID}.${key}`,
    display: `${NODE_LABEL}${VARIABLE_DELIMITER}${key}`,
    label: key,
    type: 'string',
  };
}

// Shape kept under commonByType: node id and label replaced with placeholders
function shared(key: string): VariableSuggestion {
  return {
    id: `nodes.${NODE_ID_FOR_COMMON_NODE_DATA}.${key}`,
    display: `${NODE_LABEL_FOR_COMMON_NODE_DATA}${VARIABLE_DELIMITER}${key}`,
    label: key,
    type: 'string',
  };
}

const update = {
  nodeId: NODE_ID,
  nodeType: NODE_TYPE,
  nodeLabel: NODE_LABEL,
  bySourceHandleType: {},
  cachedStore: undefined,
  shouldOnlyPassedStore: false,
} as const;

describe('setVariablesSuggestionsNodeData', () => {
  beforeEach(() => {
    useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
  });

  it('stores a common node under commonByType with the id and label replaced by placeholders', () => {
    setVariablesSuggestionsNodeData({
      ...update,
      type: SUGGESTION_NODE_TYPE.COMMON,
      bySourceHandle: { left: [suggestion('result')] },
      bySourceHandleType: { success: [suggestion('status')] },
    });

    const { commonByType, byNodeId } = useVariablesSuggestionsStore.getState();

    expect(commonByType[NODE_TYPE]).toStrictEqual({
      bySourceHandle: { left: [shared('result')] },
      bySourceHandleType: { success: [shared('status')] },
    });
    expect(byNodeId[NODE_ID]).toStrictEqual({
      type: SUGGESTION_NODE_TYPE.COMMON,
      nodeType: NODE_TYPE,
      nodeLabel: NODE_LABEL,
    });
  });

  it('stores a custom node under byNodeId as-is and leaves commonByType untouched', () => {
    const bySourceHandle = { left: [suggestion('result')] };

    setVariablesSuggestionsNodeData({ ...update, type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle });

    const { commonByType, byNodeId } = useVariablesSuggestionsStore.getState();

    expect(byNodeId[NODE_ID]).toStrictEqual({
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle,
      bySourceHandleType: {},
    });
    expect(commonByType).toStrictEqual({});
  });

  it('bumps lastUpdateIndex on every write', () => {
    setVariablesSuggestionsNodeData({ ...update, type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle: {} });
    setVariablesSuggestionsNodeData({ ...update, type: SUGGESTION_NODE_TYPE.COMMON, bySourceHandle: {} });

    expect(useVariablesSuggestionsStore.getState().lastUpdateIndex).toBe(
      emptyVariablesSuggestionsStore.lastUpdateIndex + 2,
    );
  });

  it('returns the next store without touching the zustand store when only the passed store is used', () => {
    const cachedStore = { ...emptyVariablesSuggestionsStore };

    const next = setVariablesSuggestionsNodeData({
      ...update,
      cachedStore,
      shouldOnlyPassedStore: true,
      type: SUGGESTION_NODE_TYPE.CUSTOM,
      bySourceHandle: {},
    });

    expect(next.byNodeId[NODE_ID]).toBeDefined();
    expect(cachedStore).toStrictEqual(emptyVariablesSuggestionsStore);
    expect(useVariablesSuggestionsStore.getState()).toStrictEqual(emptyVariablesSuggestionsStore);
  });
});

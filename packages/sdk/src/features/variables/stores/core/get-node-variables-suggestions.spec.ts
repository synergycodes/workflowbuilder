import { beforeEach, describe, expect, it } from 'vitest';

import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, NODE_LABEL_FOR_COMMON_NODE_DATA, VARIABLE_DELIMITER } from '../../constants';
import {
  type CommonNodeSuggestion,
  SUGGESTION_NODE_TYPE,
  type SuggestionsBySourceHandle,
  type SuggestionsBySourceHandleType,
  type SuggestionsNodeData,
} from '../types';
import {
  type VariablesSuggestionsStore,
  emptyVariablesSuggestionsStore,
  useVariablesSuggestionsStore,
} from '../use-variable-suggestions-store';
import { getNodeVariablesSuggestions, getVariableBySourceHandlesForNode } from './get-node-variables-suggestions';

function suggestion(id: string, display = id, label = id): VariableSuggestion {
  return { id, display, label, type: 'string' };
}

// Shape kept under commonByType: node id and label replaced with placeholders
function shared(key: string): VariableSuggestion {
  return suggestion(
    `nodes.${NODE_ID_FOR_COMMON_NODE_DATA}.${key}`,
    `${NODE_LABEL_FOR_COMMON_NODE_DATA}${VARIABLE_DELIMITER}${key}`,
    key,
  );
}

function resolved(nodeId: string, label: string, key: string): VariableSuggestion {
  return suggestion(`nodes.${nodeId}.${key}`, `${label}${VARIABLE_DELIMITER}${key}`, key);
}

function customNode(
  bySourceHandle: SuggestionsBySourceHandle,
  bySourceHandleType: SuggestionsBySourceHandleType = {},
): SuggestionsNodeData {
  return { type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle, bySourceHandleType };
}

function common(
  bySourceHandle: SuggestionsBySourceHandle,
  bySourceHandleType: SuggestionsBySourceHandleType = {},
): CommonNodeSuggestion {
  return { bySourceHandle, bySourceHandleType };
}

function commonNode(nodeType: string, nodeLabel: string): SuggestionsNodeData {
  return { type: SUGGESTION_NODE_TYPE.COMMON, nodeType, nodeLabel };
}

function index(store: Partial<VariablesSuggestionsStore>) {
  useVariablesSuggestionsStore.setState({ ...emptyVariablesSuggestionsStore, ...store }, true);
}

const idsOf = (sourceHandle?: string) =>
  getNodeVariablesSuggestions({ nodeId: 'n1', sourceHandle })?.map(({ id }) => id);

beforeEach(() => {
  useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
});

describe('getVariableBySourceHandlesForNode', () => {
  it('returns undefined for a node that is not indexed', () => {
    expect(getVariableBySourceHandlesForNode({ nodeId: 'missing' })).toBeUndefined();
  });

  it('returns the stored suggestions of a custom node as they are', () => {
    const bySourceHandle = { left: [suggestion('nodes.n1.left')] };
    const bySourceHandleType = { settled: [suggestion('nodes.n1.a')] };
    index({ byNodeId: { n1: customNode(bySourceHandle, bySourceHandleType) } });

    const result = getVariableBySourceHandlesForNode({ nodeId: 'n1' });

    expect(result?.bySourceHandle).toBe(bySourceHandle);
    expect(result?.bySourceHandleType).toBe(bySourceHandleType);
  });

  it('resolves a common node from the suggestions shared by its type', () => {
    index({
      commonByType: { fetch: common({ left: [shared('result')] }, { error: [shared('message')] }) },
      byNodeId: { f1: commonNode('fetch', 'Fetch') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })).toEqual({
      bySourceHandle: { left: [resolved('f1', 'Fetch', 'result')] },
      bySourceHandleType: { error: [resolved('f1', 'Fetch', 'message')] },
    });
  });

  it('gives each node of a shared type its own id and label', () => {
    index({
      commonByType: { fetch: common({}, { settled: [shared('at')] }) },
      byNodeId: { f1: commonNode('fetch', 'First'), f2: commonNode('fetch', 'Second') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })?.bySourceHandleType).toEqual({
      settled: [resolved('f1', 'First', 'at')],
    });
    expect(getVariableBySourceHandlesForNode({ nodeId: 'f2' })?.bySourceHandleType).toEqual({
      settled: [resolved('f2', 'Second', 'at')],
    });
  });

  it('truncates a long node label in the display', () => {
    index({
      commonByType: { fetch: common({}, { settled: [shared('at')] }) },
      byNodeId: { f1: commonNode('fetch', 'A very long node label') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })?.bySourceHandleType.settled?.[0]?.display).toBe(
      `A very long nod...${VARIABLE_DELIMITER}at`,
    );
  });

  it('leaves the shared suggestions untouched', () => {
    index({
      commonByType: { fetch: common({}, { settled: [shared('at')] }) },
      byNodeId: { f1: commonNode('fetch', 'Fetch') },
    });

    getVariableBySourceHandlesForNode({ nodeId: 'f1' });

    expect(useVariablesSuggestionsStore.getState().commonByType.fetch).toEqual(common({}, { settled: [shared('at')] }));
  });

  it('returns no suggestions for a common node whose type is not indexed', () => {
    index({ byNodeId: { f1: commonNode('fetch', 'Fetch') } });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })).toEqual({ bySourceHandle: {}, bySourceHandleType: {} });
  });

  it('turns a handle without suggestions into an empty list', () => {
    index({
      commonByType: { fetch: common({ left: undefined }, { success: [shared('result')] }) },
      byNodeId: { f1: commonNode('fetch', 'Fetch') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })?.bySourceHandle.left).toEqual([]);
  });

  it('reads from the passed store instead of the live one', () => {
    index({ byNodeId: { n1: customNode({ source: [suggestion('nodes.n1.live')] }) } });
    const cachedStore: VariablesSuggestionsStore = {
      ...emptyVariablesSuggestionsStore,
      byNodeId: { n1: customNode({ source: [suggestion('nodes.n1.cached')] }) },
    };

    expect(getVariableBySourceHandlesForNode({ nodeId: 'n1', cachedStore })?.bySourceHandle.source?.[0]?.id).toBe(
      'nodes.n1.cached',
    );
  });
});

describe('getNodeVariablesSuggestions', () => {
  beforeEach(() => {
    index({
      byNodeId: {
        n1: customNode(
          { left: [suggestion('nodes.n1.left')], onError: [suggestion('nodes.n1.onError')] },
          {
            settled: [suggestion('nodes.n1.settled')],
            success: [suggestion('nodes.n1.success')],
            error: [suggestion('nodes.n1.error')],
          },
        ),
      },
    });
  });

  it('returns undefined for a node that is not indexed', () => {
    expect(getNodeVariablesSuggestions({ nodeId: 'missing', sourceHandle: 'left' })).toBeUndefined();
  });

  it('adds settled and success to a handle that is not an error handle', () => {
    expect(idsOf('left')).toEqual(['nodes.n1.left', 'nodes.n1.settled', 'nodes.n1.success']);
  });

  it('adds settled and error to a handle whose id contains error, whatever the case', () => {
    expect(idsOf('onError')).toEqual(['nodes.n1.onError', 'nodes.n1.settled', 'nodes.n1.error']);
  });

  it('falls back to the type buckets for a handle without its own entry', () => {
    expect(idsOf('unknown')).toEqual(['nodes.n1.settled', 'nodes.n1.success']);
    expect(idsOf()).toEqual(['nodes.n1.settled', 'nodes.n1.success']);
  });

  it('keeps the handle copy of a variable that a type bucket repeats', () => {
    index({
      byNodeId: {
        n1: customNode(
          { left: [suggestion('nodes.n1.x', 'from handle')] },
          { settled: [suggestion('nodes.n1.x', 'from settled')] },
        ),
      },
    });

    expect(getNodeVariablesSuggestions({ nodeId: 'n1', sourceHandle: 'left' })?.map(({ display }) => display)).toEqual([
      'from handle',
    ]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import type { VariableSuggestion } from '../../components/variable-text/variable-text.types';
import { NODE_ID_FOR_COMMON_NODE_DATA, NODE_LABEL_FOR_COMMON_NODE_DATA, VARIABLE_DELIMITER } from '../../constants';
import { SUGGESTION_NODE_TYPE, type SuggestionsBySourceHandle, type SuggestionsNodeData } from '../types';
import {
  type VariablesSuggestionsStore,
  emptyVariablesSuggestionsStore,
  useVariablesSuggestionsStore,
} from '../use-variable-suggestions-store';
import { getVariableBySourceHandlesForNode } from './get-node-variables-suggestions';

function suggestion(id: string, display = id): VariableSuggestion {
  return { id, display, label: id, type: 'string' };
}

// Shape kept under commonByType: node id and label replaced with placeholders
function shared(key: string): VariableSuggestion {
  return suggestion(
    `nodes.${NODE_ID_FOR_COMMON_NODE_DATA}.${key}`,
    `${NODE_LABEL_FOR_COMMON_NODE_DATA}${VARIABLE_DELIMITER}${key}`,
  );
}

function resolved(nodeId: string, label: string, key: string): VariableSuggestion {
  return suggestion(`nodes.${nodeId}.${key}`, `${label}${VARIABLE_DELIMITER}${key}`);
}

function customNode(bySourceHandle: SuggestionsBySourceHandle): SuggestionsNodeData {
  return { type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle };
}

function commonNode(nodeType: string, nodeLabel: string): SuggestionsNodeData {
  return { type: SUGGESTION_NODE_TYPE.COMMON, nodeType, nodeLabel };
}

function index(store: Partial<VariablesSuggestionsStore>) {
  useVariablesSuggestionsStore.setState({ ...emptyVariablesSuggestionsStore, ...store }, true);
}

beforeEach(() => {
  useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
});

describe('getVariableBySourceHandlesForNode', () => {
  it('returns undefined for a node that is not indexed', () => {
    expect(getVariableBySourceHandlesForNode({ nodeId: 'missing' })).toBeUndefined();
  });

  it('returns the stored handles of a custom node as they are', () => {
    const bySourceHandle = { every: [suggestion('nodes.n1.a')], left: [suggestion('nodes.n1.left')] };
    index({ byNodeId: { n1: customNode(bySourceHandle) } });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'n1' })).toBe(bySourceHandle);
  });

  it('resolves a common node from the suggestions shared by its type', () => {
    index({
      commonByType: { fetch: { success: [shared('result')], error: [shared('message')] } },
      byNodeId: { f1: commonNode('fetch', 'Fetch') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })).toEqual({
      success: [resolved('f1', 'Fetch', 'result')],
      error: [resolved('f1', 'Fetch', 'message')],
    });
  });

  it('gives each node of a shared type its own id and label', () => {
    index({
      commonByType: { fetch: { every: [shared('at')] } },
      byNodeId: { f1: commonNode('fetch', 'First'), f2: commonNode('fetch', 'Second') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })).toEqual({ every: [resolved('f1', 'First', 'at')] });
    expect(getVariableBySourceHandlesForNode({ nodeId: 'f2' })).toEqual({ every: [resolved('f2', 'Second', 'at')] });
  });

  it('truncates a long node label in the display', () => {
    index({
      commonByType: { fetch: { every: [shared('at')] } },
      byNodeId: { f1: commonNode('fetch', 'A very long node label') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })?.every?.[0]?.display).toBe(
      `A very long nod...${VARIABLE_DELIMITER}at`,
    );
  });

  it('leaves the shared suggestions untouched', () => {
    index({ commonByType: { fetch: { every: [shared('at')] } }, byNodeId: { f1: commonNode('fetch', 'Fetch') } });

    getVariableBySourceHandlesForNode({ nodeId: 'f1' });

    expect(useVariablesSuggestionsStore.getState().commonByType.fetch).toEqual({ every: [shared('at')] });
  });

  it('returns no handles for a common node whose type is not indexed', () => {
    index({ byNodeId: { f1: commonNode('fetch', 'Fetch') } });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })).toEqual({});
  });

  it('turns a handle without suggestions into an empty list', () => {
    index({
      commonByType: { fetch: { every: undefined, success: [shared('result')] } },
      byNodeId: { f1: commonNode('fetch', 'Fetch') },
    });

    expect(getVariableBySourceHandlesForNode({ nodeId: 'f1' })?.every).toEqual([]);
  });

  it('reads from the passed store instead of the live one', () => {
    index({ byNodeId: { n1: customNode({ every: [suggestion('nodes.n1.live')] }) } });
    const cachedStore: VariablesSuggestionsStore = {
      ...emptyVariablesSuggestionsStore,
      byNodeId: { n1: customNode({ every: [suggestion('nodes.n1.cached')] }) },
    };

    expect(getVariableBySourceHandlesForNode({ nodeId: 'n1', cachedStore })?.every?.[0]?.id).toBe('nodes.n1.cached');
  });
});

import { renderHook } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCustomPaletteNodes } from '../../../data/palette';
import type { PaletteItem } from '../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../node/node-data';
import { useStore } from '../../../store/store';
import type { VariableSuggestion } from '../components/variable-text/variable-text.types';
import { SUGGESTION_NODE_TYPE } from '../stores/types';
import { emptyVariablesSuggestionsStore, useVariablesSuggestionsStore } from '../stores/use-variable-suggestions-store';
import { useNodeVariables } from './use-node-variables';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const fetchDefinition = {
  type: 'fetch',
  label: 'Fetch',
  description: '',
  icon: 'PlayCircle',
  defaultPropertiesData: {},
  schema: { type: 'object', properties: {} },
  schemaOutput: { type: 'default', bySourceHandle: {} },
} as unknown as PaletteItem;

function node(id: string): WorkflowBuilderNode {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: { type: 'fetch', icon: 'PlayCircle', properties: { label: id } },
  } as unknown as WorkflowBuilderNode;
}

function edge(source: string, target: string): WorkflowBuilderEdge {
  return { id: `${source}->${target}`, source, target };
}

function suggestion(id: string, type: VariableSuggestion['type']): VariableSuggestion {
  return { id, display: id, label: id, type };
}

describe('useNodeVariables', () => {
  beforeAll(() => setCustomPaletteNodes([fetchDefinition]));
  afterAll(() => {
    setCustomPaletteNodes(null);
    useStore.setState({ nodes: [], edges: [] });
    useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
  });

  beforeEach(() => {
    useStore.setState({
      nodes: [node('text'), node('count'), node('target')],
      edges: [edge('text', 'target'), edge('count', 'target')],
      globalVariables: {},
    });
    useVariablesSuggestionsStore.setState({
      ...emptyVariablesSuggestionsStore,
      byNodeId: {
        text: {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle: {},
          bySourceHandleType: { settled: [suggestion('nodes.text.body', 'string')] },
        },
        count: {
          type: SUGGESTION_NODE_TYPE.CUSTOM,
          bySourceHandle: {},
          bySourceHandleType: { settled: [suggestion('nodes.count.total', 'number')] },
        },
      },
    });
  });

  it('leaves out an ancestor with no variable of the included types', () => {
    const { result } = renderHook(() => useNodeVariables('target', { includeTypes: ['number'] }));

    expect(result.current.suggestionGroups.map((group) => group.suggestions.map(({ id }) => id))).toEqual([
      ['nodes.count.total'],
    ]);
    expect(result.current.totalVariables).toBe(1);
  });

  it('returns no group when no ancestor has a variable of the included types', () => {
    const { result } = renderHook(() => useNodeVariables('target', { includeTypes: ['boolean'] }));

    expect(result.current.suggestionGroups).toEqual([]);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { setCustomPaletteNodes } from '../../../../data/palette';
import type { PaletteItem } from '../../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import type { VariableSuggestion, VariableSuggestionGroup } from '../../components/variable-text/variable-text.types';
import { SUGGESTION_NODE_TYPE, type SuggestionsBySourceHandle } from '../../stores/types';
import {
  emptyVariablesSuggestionsStore,
  useVariablesSuggestionsStore,
} from '../../stores/use-variable-suggestions-store';
import { getAvailableVariablesByNodeId } from './get-available-variables-by-node-id';

const fetchDefinition = {
  type: 'fetch',
  label: 'Fetch',
  description: '',
  icon: 'PlayCircle',
  defaultPropertiesData: {},
  schema: { type: 'object', properties: {} },
  schemaOutput: { type: 'default', bySourceHandle: {} },
} as unknown as PaletteItem;

const bareDefinition = { ...fetchDefinition, type: 'bare', label: 'Bare', schemaOutput: undefined } as PaletteItem;

type NodeOptions = { type?: string; label?: string; icon?: string };

function node(id: string, { type = 'fetch', label, icon = 'PlayCircle' }: NodeOptions = {}): WorkflowBuilderNode {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: { type, icon, properties: label ? { label } : {} },
  } as unknown as WorkflowBuilderNode;
}

function edge(source: string, target: string, sourceHandle?: string): WorkflowBuilderEdge {
  return { id: `${source}:${sourceHandle ?? ''}->${target}`, source, target, sourceHandle };
}

function suggestion(id: string, type: VariableSuggestion['type'] = 'string'): VariableSuggestion {
  return { id, display: id, label: id, type };
}

function index(byNodeId: Record<string, SuggestionsBySourceHandle>) {
  useVariablesSuggestionsStore.setState({
    byNodeId: Object.fromEntries(
      Object.entries(byNodeId).map(([nodeId, bySourceHandle]) => [
        nodeId,
        { type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle },
      ]),
    ),
  });
}

type Filters = Partial<Pick<Parameters<typeof getAvailableVariablesByNodeId>[0], 'excludeTypes' | 'includeTypes'>>;

function available(
  nodeId: string | undefined,
  nodes: WorkflowBuilderNode[],
  edges: WorkflowBuilderEdge[],
  filters: Filters = {},
): VariableSuggestionGroup[] {
  return getAvailableVariablesByNodeId({ nodeId, nodes, edges, excludeTypes: [], includeTypes: [], ...filters });
}

const idsOf = (group: VariableSuggestionGroup | undefined) => group?.suggestions.map(({ id }) => id);
const labelsOf = (groups: VariableSuggestionGroup[]) => groups.map(({ label }) => label);

beforeAll(() => {
  setCustomPaletteNodes([fetchDefinition, bareDefinition]);
});

afterAll(() => {
  setCustomPaletteNodes(null);
});

beforeEach(() => {
  useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
});

describe('getAvailableVariablesByNodeId', () => {
  it('returns no groups without a node id', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    expect(available(undefined, [node('parent'), node('target')], [edge('parent', 'target')])).toEqual([]);
  });

  it('returns no groups for a node without ancestors', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    expect(available('target', [node('parent'), node('target')], [edge('target', 'parent')])).toEqual([]);
  });

  it('groups the suggestions of a direct ancestor under the node label and icon', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    const groups = available(
      'target',
      [node('parent', { label: 'Parent', icon: 'Timer' }), node('target')],
      [edge('parent', 'target')],
    );

    expect(groups).toEqual([{ label: 'Parent', icon: 'Timer', suggestions: [suggestion('nodes.parent.a')] }]);
  });

  it('falls back to the definition label when the node has none', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')]);

    expect(labelsOf(groups)).toEqual(['Fetch']);
  });

  it('includes transitive ancestors, direct parents first', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] }, grand: { every: [suggestion('nodes.grand.a')] } });

    const groups = available(
      'target',
      [node('grand', { label: 'Grand' }), node('parent', { label: 'Parent' }), node('target')],
      [edge('grand', 'parent'), edge('parent', 'target')],
    );

    expect(labelsOf(groups)).toEqual(['Parent', 'Grand']);
    expect(idsOf(groups[1])).toEqual(['nodes.grand.a']);
  });

  it('skips an ancestor that is not among the nodes', () => {
    index({ ghost: { every: [suggestion('nodes.ghost.a')] } });

    expect(available('target', [node('target')], [edge('ghost', 'target')])).toEqual([]);
  });

  it('skips an ancestor whose definition has no output schema', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    expect(available('target', [node('parent', { type: 'bare' }), node('target')], [edge('parent', 'target')])).toEqual(
      [],
    );
  });

  it('skips an ancestor without a definition', () => {
    index({ parent: { every: [suggestion('nodes.parent.a')] } });

    expect(
      available('target', [node('parent', { type: 'unknown' }), node('target')], [edge('parent', 'target')]),
    ).toEqual([]);
  });

  it('returns an empty group for an ancestor that is not indexed yet', () => {
    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')]);

    expect(groups).toEqual([{ label: 'Fetch', icon: 'PlayCircle', suggestions: [] }]);
  });

  it('resolves suggestions by the source handle the edge leaves from', () => {
    index({ parent: { left: [suggestion('nodes.parent.left')], right: [suggestion('nodes.parent.right')] } });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target', 'right')]);

    expect(idsOf(groups[0])).toEqual(['nodes.parent.right']);
  });

  it('merges a node reached through two handles into one group without duplicates', () => {
    index({
      parent: {
        every: [suggestion('nodes.parent.shared')],
        left: [suggestion('nodes.parent.left')],
        right: [suggestion('nodes.parent.right')],
      },
    });

    const groups = available(
      'target',
      [node('parent'), node('target')],
      [edge('parent', 'target', 'left'), edge('parent', 'target', 'right')],
    );

    expect(groups).toHaveLength(1);
    expect(idsOf(groups[0])).toEqual(['nodes.parent.left', 'nodes.parent.shared', 'nodes.parent.right']);
  });

  it('merges ancestors sharing a label into one group', () => {
    index({ p1: { every: [suggestion('nodes.p1.a')] }, p2: { every: [suggestion('nodes.p2.a')] } });

    const groups = available(
      'target',
      [node('p1'), node('p2'), node('target')],
      [edge('p1', 'target'), edge('p2', 'target')],
    );

    expect(labelsOf(groups)).toEqual(['Fetch']);
    expect(idsOf(groups[0])).toEqual(['nodes.p1.a', 'nodes.p2.a']);
  });

  it('filters suggestions by excluded and included types', () => {
    index({
      parent: {
        every: [
          suggestion('nodes.parent.text', 'string'),
          suggestion('nodes.parent.count', 'number'),
          suggestion('nodes.parent.flag', 'boolean'),
        ],
      },
    });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')], {
      excludeTypes: ['boolean'],
      includeTypes: ['string', 'boolean'],
    });

    expect(idsOf(groups[0])).toEqual(['nodes.parent.text']);
  });
});

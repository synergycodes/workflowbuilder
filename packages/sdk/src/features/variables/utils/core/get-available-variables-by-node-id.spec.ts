import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { setCustomPaletteNodes } from '../../../../data/palette';
import type { PaletteItem } from '../../../../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../../../../node/node-data';
import type { VariableSuggestion, VariableSuggestionGroup } from '../../components/variable-text/variable-text.types';
import { type NodeVariablesSuggestions, SUGGESTION_NODE_TYPE } from '../../stores/types';
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

// Reachable from every handle of the node
function settled(...suggestions: VariableSuggestion[]): Partial<NodeVariablesSuggestions> {
  return { bySourceHandleType: { settled: suggestions } };
}

function index(byNodeId: Record<string, Partial<NodeVariablesSuggestions>>) {
  useVariablesSuggestionsStore.setState({
    byNodeId: Object.fromEntries(
      Object.entries(byNodeId).map(([nodeId, { bySourceHandle = {}, bySourceHandleType = {} }]) => [
        nodeId,
        { type: SUGGESTION_NODE_TYPE.CUSTOM, bySourceHandle, bySourceHandleType },
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
    index({ parent: settled(suggestion('nodes.parent.a')) });

    expect(available(undefined, [node('parent'), node('target')], [edge('parent', 'target')])).toEqual([]);
  });

  it('returns no groups for a node without ancestors', () => {
    index({ parent: settled(suggestion('nodes.parent.a')) });

    expect(available('target', [node('parent'), node('target')], [edge('target', 'parent')])).toEqual([]);
  });

  it('groups the suggestions of a direct ancestor under the node label and icon', () => {
    index({ parent: settled(suggestion('nodes.parent.a')) });

    const groups = available(
      'target',
      [node('parent', { label: 'Parent', icon: 'Timer' }), node('target')],
      [edge('parent', 'target')],
    );

    expect(groups).toEqual([{ label: 'Parent', icon: 'Timer', suggestions: [suggestion('nodes.parent.a')] }]);
  });

  it('falls back to the definition label when the node has none', () => {
    index({ parent: settled(suggestion('nodes.parent.a')) });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')]);

    expect(labelsOf(groups)).toEqual(['Fetch']);
  });

  it('includes transitive ancestors, direct parents first', () => {
    index({ parent: settled(suggestion('nodes.parent.a')), grand: settled(suggestion('nodes.grand.a')) });

    const groups = available(
      'target',
      [node('grand', { label: 'Grand' }), node('parent', { label: 'Parent' }), node('target')],
      [edge('grand', 'parent'), edge('parent', 'target')],
    );

    expect(labelsOf(groups)).toEqual(['Parent', 'Grand']);
    expect(idsOf(groups[1])).toEqual(['nodes.grand.a']);
  });

  it('skips an ancestor that is not among the nodes', () => {
    index({ ghost: settled(suggestion('nodes.ghost.a')) });

    expect(available('target', [node('target')], [edge('ghost', 'target')])).toEqual([]);
  });

  it('skips an ancestor whose definition has no output schema', () => {
    index({ parent: settled(suggestion('nodes.parent.a')) });

    expect(available('target', [node('parent', { type: 'bare' }), node('target')], [edge('parent', 'target')])).toEqual(
      [],
    );
  });

  it('skips an ancestor without a definition', () => {
    index({ parent: settled(suggestion('nodes.parent.a')) });

    expect(
      available('target', [node('parent', { type: 'unknown' }), node('target')], [edge('parent', 'target')]),
    ).toEqual([]);
  });

  it('returns an empty group for an ancestor that is not indexed yet', () => {
    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')]);

    expect(groups).toEqual([{ label: 'Fetch', icon: 'PlayCircle', suggestions: [] }]);
  });

  it('resolves suggestions by the source handle the edge leaves from', () => {
    index({
      parent: {
        bySourceHandle: { left: [suggestion('nodes.parent.left')], right: [suggestion('nodes.parent.right')] },
      },
    });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target', 'right')]);

    expect(idsOf(groups[0])).toEqual(['nodes.parent.right']);
  });

  it('merges a node reached through two handles into one group without duplicates', () => {
    index({
      parent: {
        bySourceHandle: { left: [suggestion('nodes.parent.left')], right: [suggestion('nodes.parent.right')] },
        bySourceHandleType: { settled: [suggestion('nodes.parent.shared')] },
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

  it('numbers the labels of ancestors sharing a label, keeping separate groups', () => {
    index({ p1: settled(suggestion('nodes.p1.a')), p2: settled(suggestion('nodes.p2.a')), p3: settled() });

    const groups = available(
      'target',
      [node('p1'), node('p2'), node('p3'), node('target')],
      [edge('p1', 'target'), edge('p2', 'target'), edge('p3', 'target')],
    );

    expect(labelsOf(groups)).toEqual(['Fetch', 'Fetch (2)', 'Fetch (3)']);
    expect(groups.map(idsOf)).toEqual([['nodes.p1.a'], ['nodes.p2.a'], []]);
  });

  it('skips a numbered label another ancestor already carries', () => {
    index({ p1: settled(), p2: settled(), p3: settled() });

    const groups = available(
      'target',
      [node('p1'), node('p2', { label: 'Fetch (2)' }), node('p3'), node('target')],
      [edge('p1', 'target'), edge('p2', 'target'), edge('p3', 'target')],
    );

    expect(labelsOf(groups)).toEqual(['Fetch', 'Fetch (2)', 'Fetch (3)']);
  });

  it('keeps one label for a node reached through two handles', () => {
    index({ parent: settled(), other: settled() });

    const groups = available(
      'target',
      [node('parent'), node('other'), node('target')],
      [edge('parent', 'target', 'left'), edge('other', 'target'), edge('parent', 'target', 'right')],
    );

    expect(labelsOf(groups)).toEqual(['Fetch', 'Fetch (2)']);
  });

  it('filters suggestions by excluded and included types', () => {
    index({
      parent: settled(
        suggestion('nodes.parent.text', 'string'),
        suggestion('nodes.parent.count', 'number'),
        suggestion('nodes.parent.flag', 'boolean'),
      ),
    });

    const groups = available('target', [node('parent'), node('target')], [edge('parent', 'target')], {
      excludeTypes: ['boolean'],
      includeTypes: ['string', 'boolean'],
    });

    expect(idsOf(groups[0])).toEqual(['nodes.parent.text']);
  });
});

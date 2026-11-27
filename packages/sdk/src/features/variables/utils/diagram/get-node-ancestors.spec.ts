import { describe, expect, it } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { getNodeAncestors } from './get-node-ancestors';

function edge(source: string, target: string, sourceHandle?: string | null): WorkflowBuilderEdge {
  return { id: `${source}-${target}-${sourceHandle ?? ''}`, source, target, sourceHandle } as WorkflowBuilderEdge;
}

describe('getNodeAncestors', () => {
  it('returns empty list when node has no incoming edges', () => {
    expect(getNodeAncestors('a', [edge('a', 'b')])).toEqual([]);
  });

  it('returns empty list for empty edges', () => {
    expect(getNodeAncestors('a', [])).toEqual([]);
  });

  it('returns direct parent with its source handle', () => {
    expect(getNodeAncestors('b', [edge('a', 'b', 'success')])).toEqual([{ source: 'a', sourceHandle: 'success' }]);
  });

  it('normalizes null source handle to undefined', () => {
    expect(getNodeAncestors('b', [edge('a', 'b', null)])).toEqual([{ source: 'a', sourceHandle: undefined }]);
  });

  it('keeps undefined source handle', () => {
    expect(getNodeAncestors('b', [edge('a', 'b')])).toEqual([{ source: 'a', sourceHandle: undefined }]);
  });

  it('walks transitively through every ancestor', () => {
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd')];

    expect(getNodeAncestors('d', edges).map(({ source }) => source)).toEqual(['c', 'b', 'a']);
  });

  it('returns closer ancestors before farther ones', () => {
    const edges = [edge('root', 'x'), edge('x', 'target'), edge('y', 'target')];

    expect(getNodeAncestors('target', edges).map(({ source }) => source)).toEqual(['x', 'y', 'root']);
  });

  it('ignores descendants and unrelated nodes', () => {
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('x', 'y')];

    expect(getNodeAncestors('b', edges)).toEqual([{ source: 'a', sourceHandle: undefined }]);
  });

  it('returns separate entries for the same source connected via different handles', () => {
    const edges = [edge('a', 'b', 'success'), edge('a', 'b', 'error')];

    expect(getNodeAncestors('b', edges)).toEqual([
      { source: 'a', sourceHandle: 'success' },
      { source: 'a', sourceHandle: 'error' },
    ]);
  });

  it('deduplicates the same source and handle reached through different paths', () => {
    const edges = [edge('a', 'b', 'out'), edge('a', 'c', 'out'), edge('b', 'd'), edge('c', 'd')];

    expect(getNodeAncestors('d', edges)).toEqual([
      { source: 'b', sourceHandle: undefined },
      { source: 'c', sourceHandle: undefined },
      { source: 'a', sourceHandle: 'out' },
    ]);
  });

  it('terminates on cycles and includes the node itself when it is its own ancestor', () => {
    const edges = [edge('a', 'b'), edge('b', 'a')];

    expect(getNodeAncestors('a', edges)).toEqual([
      { source: 'b', sourceHandle: undefined },
      { source: 'a', sourceHandle: undefined },
    ]);
  });

  it('terminates on a self loop', () => {
    expect(getNodeAncestors('a', [edge('a', 'a')])).toEqual([{ source: 'a', sourceHandle: undefined }]);
  });
});

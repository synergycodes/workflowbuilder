import type { WorkflowBuilderEdge } from '../../node/node-data';
import { filterOutEdgesBySourceHandles } from './filter-out-edges-by-source-handles';

function edge(partial: Partial<WorkflowBuilderEdge>): WorkflowBuilderEdge {
  return {
    id: partial.id ?? `${partial.source}-${partial.sourceHandle}-${partial.target}-${partial.targetHandle}`,
    source: partial.source ?? 'src',
    target: partial.target ?? 'tgt',
    sourceHandle: partial.sourceHandle,
    targetHandle: partial.targetHandle,
    data: {},
  };
}

describe('filterOutEdgesBySourceHandles', () => {
  it('returns the same array reference when handle list is empty', () => {
    const edges = [edge({ source: 'a', sourceHandle: 'source' })];
    expect(filterOutEdgesBySourceHandles(edges, 'a', [])).toBe(edges);
  });

  it('removes edges whose source matches and sourceHandle is in the set', () => {
    const keep = edge({ source: 'a', sourceHandle: 'source' });
    const drop = edge({ source: 'a', sourceHandle: 'source:inner:branch-1' });
    expect(filterOutEdgesBySourceHandles([keep, drop], 'a', ['source:inner:branch-1'])).toEqual([keep]);
  });

  it('does not remove edges from a different source node even when sourceHandle matches', () => {
    const sameHandleDifferentNode = edge({ source: 'b', sourceHandle: 'source:inner:branch-1' });
    const targetedDrop = edge({ source: 'a', sourceHandle: 'source:inner:branch-1' });
    const result = filterOutEdgesBySourceHandles([sameHandleDifferentNode, targetedDrop], 'a', [
      'source:inner:branch-1',
    ]);
    expect(result).toEqual([sameHandleDifferentNode]);
  });

  it('keeps edges with no sourceHandle', () => {
    const edgeWithoutHandle = edge({ source: 'a', sourceHandle: undefined });
    expect(filterOutEdgesBySourceHandles([edgeWithoutHandle], 'a', ['source'])).toEqual([edgeWithoutHandle]);
  });

  it('removes multiple matching edges in one pass', () => {
    const a = edge({ id: 'a', source: 'n', sourceHandle: 'source:inner:1' });
    const b = edge({ id: 'b', source: 'n', sourceHandle: 'source:inner:2' });
    const c = edge({ id: 'c', source: 'n', sourceHandle: 'source:inner:3' });
    const result = filterOutEdgesBySourceHandles([a, b, c], 'n', ['source:inner:1', 'source:inner:3']);
    expect(result).toEqual([b]);
  });
});

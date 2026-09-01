import { describe, expect, it } from 'vitest';

import type { BaseNode, WorkflowEdgeDefinition } from '@workflow-builder/types/workflow-execution/execution-model';

import { resolveStartNode } from './resolve-start-node';

type TestNode = BaseNode & { type: 'test/node' };

function node(id: string): TestNode {
  return { id, type: 'test/node', config: {} };
}

function start(id: string): TestNode {
  return { id, type: 'test/node', config: {}, role: 'start' };
}

function edge(id: string, source: string, target: string): WorkflowEdgeDefinition {
  return { id, sourceNodeId: source, targetNodeId: target };
}

// Mirrors `computeInDegrees` in graph-runner.ts. Kept local rather than imported so
// these tests exercise `resolveStartNode` against a plain map, independent of how the
// runner happens to build one.
function inDegreeOf(nodes: TestNode[], edges: WorkflowEdgeDefinition[]): Map<string, number> {
  const inDegree = new Map(nodes.map((node_) => [node_.id, 0]));
  for (const { targetNodeId } of edges) {
    if (inDegree.has(targetNodeId)) inDegree.set(targetNodeId, (inDegree.get(targetNodeId) ?? 0) + 1);
  }
  return inDegree;
}

function resolve(nodes: TestNode[], edges: WorkflowEdgeDefinition[] = []) {
  return resolveStartNode(nodes, inDegreeOf(nodes, edges));
}

describe('resolveStartNode — the accepted shape', () => {
  it('returns the declared start node', () => {
    const nodes = [start('T'), node('A'), node('B')];

    const result = resolve(nodes, [edge('e1', 'T', 'A'), edge('e2', 'A', 'B')]);

    expect(result).toEqual({ startNode: nodes[0] });
  });

  it('accepts a start node listed after the nodes it feeds', () => {
    const nodes = [node('A'), node('B'), start('T')];

    const result = resolve(nodes, [edge('e1', 'T', 'A'), edge('e2', 'A', 'B')]);

    expect(result).toEqual({ startNode: nodes[2] });
  });

  it('accepts a lone start node with no edges at all', () => {
    const nodes = [start('T')];

    expect(resolve(nodes)).toEqual({ startNode: nodes[0] });
  });

  it('accepts a node that is unreachable but still has an incoming edge', () => {
    // B and C form a cycle disconnected from the start. Neither sits at in-degree 0,
    // so this is not an orphan; the runner's post-loop stall check owns this case and
    // reports it with the list of nodes that never became ready.
    const nodes = [start('T'), node('A'), node('B'), node('C')];

    const result = resolve(nodes, [edge('e1', 'T', 'A'), edge('e2', 'B', 'C'), edge('e3', 'C', 'B')]);

    expect(result).toEqual({ startNode: nodes[0] });
  });
});

describe('resolveStartNode — rejected shapes', () => {
  it('rejects a graph where no node is marked as the start', () => {
    const result = resolve([node('A'), node('B')], [edge('e1', 'A', 'B')]);

    expect(result).toEqual({
      error: 'Workflow has no start node: exactly one node must be marked as the start node',
    });
  });

  it('rejects an empty graph', () => {
    expect(resolve([])).toEqual({
      error: 'Workflow has no start node: exactly one node must be marked as the start node',
    });
  });

  it('rejects two start nodes, naming both', () => {
    const result = resolve([start('T1'), start('T2'), node('Out')], [edge('e1', 'T1', 'Out'), edge('e2', 'T2', 'Out')]);

    expect(result).toEqual({
      error: 'Workflow has 2 start nodes, but exactly one is allowed: T1, T2',
    });
  });

  it('rejects three start nodes, counting and naming all of them in node order', () => {
    const result = resolve([start('T1'), node('A'), start('T2'), start('T3')], [edge('e1', 'T1', 'A')]);

    expect(result).toEqual({
      error: 'Workflow has 3 start nodes, but exactly one is allowed: T1, T2, T3',
    });
  });

  it('rejects an edge back into the start node', () => {
    const result = resolve([start('T'), node('A')], [edge('e1', 'T', 'A'), edge('e2', 'A', 'T')]);

    expect(result).toEqual({
      error: 'Start node "T" has incoming edges: the start node must have none',
    });
  });

  it('rejects a node left with no incoming edge alongside a valid start', () => {
    // The motivating case: Orphan's only edge was deleted. Inferring roots from
    // in-degree would run it in the first wave with no upstream output.
    const result = resolve([start('T'), node('A'), node('Orphan')], [edge('e1', 'T', 'A')]);

    expect(result).toEqual({
      error: 'Workflow has orphaned nodes (no incoming edge and not a start node): Orphan',
    });
  });

  it('names every orphan, not just the first', () => {
    const result = resolve([start('T'), node('A'), node('Orphan1'), node('Orphan2')], [edge('e1', 'T', 'A')]);

    expect(result).toEqual({
      error: 'Workflow has orphaned nodes (no incoming edge and not a start node): Orphan1, Orphan2',
    });
  });
});

describe('resolveStartNode — which rule reports first', () => {
  // The checks are ordered cheapest-to-most-specific, and each message is only
  // actionable if the ones before it already hold. Pinned so a reordering has to be
  // deliberate: an author fixing the reported problem should not hit a different
  // message for a problem they did not introduce.

  it('reports the missing start before any orphan', () => {
    // With no start declared, every in-degree-0 node looks like an orphan. Reporting
    // those first would name nodes that are fine once a start exists.
    const result = resolve([node('A'), node('B')], []);

    expect(result).toEqual({
      error: 'Workflow has no start node: exactly one node must be marked as the start node',
    });
  });

  it('reports duplicate starts before an edge back into one of them', () => {
    const result = resolve([start('T1'), start('T2')], [edge('e1', 'T2', 'T1')]);

    expect(result).toEqual({
      error: 'Workflow has 2 start nodes, but exactly one is allowed: T1, T2',
    });
  });

  it('reports an edge back into the start before any orphan', () => {
    const result = resolve([start('T'), node('A'), node('Orphan')], [edge('e1', 'T', 'A'), edge('e2', 'A', 'T')]);

    expect(result).toEqual({
      error: 'Start node "T" has incoming edges: the start node must have none',
    });
  });
});

describe('resolveStartNode — in-degree map edge cases', () => {
  it('treats a node missing from the map as having no incoming edges', () => {
    // The runner always passes a complete map, but a partial one must not silently
    // promote an unlisted node to "has predecessors" and hide it from the orphan check.
    const nodes = [start('T'), node('Orphan')];

    const result = resolveStartNode(nodes, new Map([['T', 0]]));

    expect(result).toEqual({
      error: 'Workflow has orphaned nodes (no incoming edge and not a start node): Orphan',
    });
  });

  it('does not mutate the map it is given', () => {
    const nodes = [start('T'), node('A')];
    const inDegree = inDegreeOf(nodes, [edge('e1', 'T', 'A')]);

    resolveStartNode(nodes, inDegree);

    // The runner copies this map into its scheduler state right after calling us.
    expect([...inDegree]).toEqual([
      ['T', 0],
      ['A', 1],
    ]);
  });
});

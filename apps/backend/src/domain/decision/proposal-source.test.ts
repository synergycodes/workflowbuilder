import { describe, expect, it } from 'vitest';

import type { DecisionContract } from '@workflow-builder/types/workflow-execution/decision-contract';

import { resolveProposalSource } from './proposal-source';

function contract(proposalSourceNodeId?: string): DecisionContract {
  return {
    version: 1,
    actions: [{ name: 'approve', label: 'Approve', effect: 'resume', port: 'approved' }],
    schema: { type: 'object', properties: {} },
    ...(proposalSourceNodeId === undefined ? {} : { proposalSourceNodeId }),
  };
}

function edge(sourceNodeId: string, targetNodeId: string) {
  return { sourceNodeId, targetNodeId };
}

describe('resolveProposalSource', () => {
  it('reports a node without a contract, or an unknown id, as a node without decision', () => {
    const nodes = [{ id: 'plain' }];

    expect(resolveProposalSource(nodes, [], 'plain')).toEqual({ error: 'node_without_decision' });
    expect(resolveProposalSource(nodes, [], 'missing')).toEqual({ error: 'node_without_decision' });
  });

  it('returns an explicit source that is a direct predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'review', decision: contract('a') }];
    const edges = [edge('a', 'review'), edge('b', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('rejects an explicit source that is not a direct predecessor, including a successor', () => {
    const nodes = [{ id: 'a' }, { id: 'after' }, { id: 'review', decision: contract('after') }];
    const edges = [edge('a', 'review'), edge('review', 'after')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ error: 'explicit_source_not_a_predecessor' });
  });

  it('falls back to the only direct predecessor when no source is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'review', decision: contract() }];

    expect(resolveProposalSource(nodes, [edge('a', 'review')], 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('counts parallel edges from one node as a single predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'review', decision: contract() }];
    const edges = [edge('a', 'review'), edge('a', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('reports no predecessor when the node has only outgoing edges', () => {
    const nodes = [{ id: 'review', decision: contract() }, { id: 'after' }];

    expect(resolveProposalSource(nodes, [edge('review', 'after')], 'review')).toEqual({ error: 'no_predecessor' });
  });

  it('reports ambiguity when several predecessors exist and none is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'review', decision: contract() }];
    const edges = [edge('a', 'review'), edge('b', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ error: 'ambiguous_predecessor' });
  });
});

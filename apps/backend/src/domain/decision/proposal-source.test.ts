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
  it('reports a node without a contract, or an unknown id, as not a gate', () => {
    const nodes = [{ id: 'plain' }];

    expect(resolveProposalSource(nodes, [], 'plain')).toEqual({ error: 'not_a_gate' });
    expect(resolveProposalSource(nodes, [], 'missing')).toEqual({ error: 'not_a_gate' });
  });

  it('returns an explicit source that is a direct predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'gate', decision: contract('a') }];
    const edges = [edge('a', 'gate'), edge('b', 'gate')];

    expect(resolveProposalSource(nodes, edges, 'gate')).toEqual({ sourceNodeId: 'a' });
  });

  it('rejects an explicit source that is not a direct predecessor, including a successor', () => {
    const nodes = [{ id: 'a' }, { id: 'after' }, { id: 'gate', decision: contract('after') }];
    const edges = [edge('a', 'gate'), edge('gate', 'after')];

    expect(resolveProposalSource(nodes, edges, 'gate')).toEqual({ error: 'explicit_source_not_a_predecessor' });
  });

  it('falls back to the only direct predecessor when no source is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'gate', decision: contract() }];

    expect(resolveProposalSource(nodes, [edge('a', 'gate')], 'gate')).toEqual({ sourceNodeId: 'a' });
  });

  it('counts parallel edges from one node as a single predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'gate', decision: contract() }];
    const edges = [edge('a', 'gate'), edge('a', 'gate')];

    expect(resolveProposalSource(nodes, edges, 'gate')).toEqual({ sourceNodeId: 'a' });
  });

  it('reports no predecessor when the gate has only outgoing edges', () => {
    const nodes = [{ id: 'gate', decision: contract() }, { id: 'after' }];

    expect(resolveProposalSource(nodes, [edge('gate', 'after')], 'gate')).toEqual({ error: 'no_predecessor' });
  });

  it('reports ambiguity when several predecessors exist and none is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'gate', decision: contract() }];
    const edges = [edge('a', 'gate'), edge('b', 'gate')];

    expect(resolveProposalSource(nodes, edges, 'gate')).toEqual({ error: 'ambiguous_predecessor' });
  });
});

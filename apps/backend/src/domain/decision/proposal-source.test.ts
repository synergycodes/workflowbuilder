import { describe, expect, it } from 'vitest';

import type { DecisionRequest } from '@workflow-builder/types/workflow-execution/decision-request';

import { resolveProposalSource } from './proposal-source';

function request(proposalSourceNodeId?: string): DecisionRequest {
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
  it('reports a node without a request, or an unknown id, as a node without a decision request', () => {
    const nodes = [{ id: 'plain' }];

    expect(resolveProposalSource(nodes, [], 'plain')).toEqual({ error: 'node_without_decision_request' });
    expect(resolveProposalSource(nodes, [], 'missing')).toEqual({ error: 'node_without_decision_request' });
  });

  it('returns an explicit source that is a direct predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'review', decisionRequest: request('a') }];
    const edges = [edge('a', 'review'), edge('b', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('rejects an explicit source that is not a direct predecessor, including a successor', () => {
    const nodes = [{ id: 'a' }, { id: 'after' }, { id: 'review', decisionRequest: request('after') }];
    const edges = [edge('a', 'review'), edge('review', 'after')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ error: 'explicit_source_not_a_predecessor' });
  });

  it('falls back to the only direct predecessor when no source is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'review', decisionRequest: request() }];

    expect(resolveProposalSource(nodes, [edge('a', 'review')], 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('counts parallel edges from one node as a single predecessor', () => {
    const nodes = [{ id: 'a' }, { id: 'review', decisionRequest: request() }];
    const edges = [edge('a', 'review'), edge('a', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ sourceNodeId: 'a' });
  });

  it('does not count a self-loop as a predecessor, explicit or implicit', () => {
    const explicitSelf = [{ id: 'a' }, { id: 'review', decisionRequest: request('review') }];
    const implicitSelf = [{ id: 'review', decisionRequest: request() }];

    expect(resolveProposalSource(explicitSelf, [edge('a', 'review'), edge('review', 'review')], 'review')).toEqual({
      error: 'explicit_source_not_a_predecessor',
    });
    expect(resolveProposalSource(implicitSelf, [edge('review', 'review')], 'review')).toEqual({
      error: 'no_predecessor',
    });
  });

  it('reports no predecessor when the node has only outgoing edges', () => {
    const nodes = [{ id: 'review', decisionRequest: request() }, { id: 'after' }];

    expect(resolveProposalSource(nodes, [edge('review', 'after')], 'review')).toEqual({ error: 'no_predecessor' });
  });

  it('reports ambiguity when several predecessors exist and none is declared', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'review', decisionRequest: request() }];
    const edges = [edge('a', 'review'), edge('b', 'review')];

    expect(resolveProposalSource(nodes, edges, 'review')).toEqual({ error: 'ambiguous_predecessor' });
  });
});

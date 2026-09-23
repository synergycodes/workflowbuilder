import { describe, expect, it } from 'vitest';

import { executionEvent as event } from '../stores/execution-event.fixture';
import { attemptOf, proposalSourceIdOf } from './use-node-decision';

describe('attemptOf', () => {
  it('is zero when the node never parked', () => {
    expect(attemptOf([event({ type: 'node_started', nodeId: 'human-1' })], 'human-1')).toBe(0);
  });

  it('counts node_waiting events of that node only', () => {
    const events = [
      event({ type: 'node_waiting', nodeId: 'human-1' }),
      event({ type: 'node_waiting', nodeId: 'human-2' }),
      event({ type: 'node_completed', nodeId: 'human-1', payload: { output: {} } }),
      event({ type: 'node_waiting', nodeId: 'human-1' }),
    ];
    expect(attemptOf(events, 'human-1')).toBe(2);
    expect(attemptOf(events, 'human-2')).toBe(1);
  });
});

describe('proposalSourceIdOf', () => {
  const edges = [
    { source: 'draft-1', target: 'human-1' },
    { source: 'human-1', target: 'send-1' },
  ];

  it('prefers a declared proposalSourceNodeId', () => {
    expect(proposalSourceIdOf('other-1', edges, 'human-1')).toBe('other-1');
  });

  it('falls back to the source of the single incoming edge', () => {
    expect(proposalSourceIdOf(undefined, edges, 'human-1')).toBe('draft-1');
  });

  it('counts one source once when two edges come from the same node', () => {
    const twoHandles = [...edges, { source: 'draft-1', target: 'human-1' }];
    expect(proposalSourceIdOf(undefined, twoHandles, 'human-1')).toBe('draft-1');
  });

  it.each([
    ['no incoming edge', []],
    ['two different sources', [...edges, { source: 'draft-2', target: 'human-1' }]],
  ])('is undefined with %s', (_name, candidates) => {
    expect(proposalSourceIdOf(undefined, candidates, 'human-1')).toBeUndefined();
  });
});

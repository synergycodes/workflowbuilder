import { ApplicationFailure } from '@temporalio/workflow';
import { describe, expect, it } from 'vitest';

import { type NodeWaitState, validateVerdict } from './verdict-validation';

const KNOWN_NODES = new Set(['start', 'gate', 'after']);
const GATE_WAITING = new Map<string, NodeWaitState>([['gate', { status: 'waiting' }]]);

function rejection(verdict?: unknown, waits: ReadonlyMap<string, NodeWaitState> = GATE_WAITING): string | undefined {
  try {
    validateVerdict(verdict, KNOWN_NODES, waits);
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationFailure);
    return (error as ApplicationFailure).type ?? undefined;
  }
}

describe('validateVerdict', () => {
  it('accepts a well-formed verdict for a waiting node', () => {
    expect(rejection({ nodeId: 'gate', resolution: { output: 'ok' } })).toBeUndefined();
    expect(rejection({ nodeId: 'gate', resolution: { output: null, nextPort: 'approved' } })).toBeUndefined();
  });

  it('rejects a non-object input', () => {
    expect(rejection()).toBe('verdict_malformed');
    expect(rejection(null)).toBe('verdict_malformed');
    expect(rejection('gate')).toBe('verdict_malformed');
  });

  it('rejects a missing, empty or non-string nodeId', () => {
    expect(rejection({ resolution: { output: 1 } })).toBe('verdict_malformed');
    expect(rejection({ nodeId: '', resolution: { output: 1 } })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 7, resolution: { output: 1 } })).toBe('verdict_malformed');
  });

  it('rejects a resolution that is missing, null or without output', () => {
    expect(rejection({ nodeId: 'gate' })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 'gate', resolution: null })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 'gate', resolution: {} })).toBe('verdict_malformed');
  });

  it('rejects envelope keys beyond output and nextPort', () => {
    expect(rejection({ nodeId: 'gate', resolution: { output: 1, nexPort: 'typo' } })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 'gate', resolution: { output: 1, waiting: true } })).toBe('verdict_malformed');
  });

  it('rejects a nextPort that is empty, non-string or the reserved errorRoute', () => {
    expect(rejection({ nodeId: 'gate', resolution: { output: 1, nextPort: '' } })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 'gate', resolution: { output: 1, nextPort: 5 } })).toBe('verdict_malformed');
    expect(rejection({ nodeId: 'gate', resolution: { output: 1, nextPort: 'errorRoute' } })).toBe('verdict_malformed');
  });

  it('rejects a node that is not in the definition', () => {
    expect(rejection({ nodeId: 'ghost', resolution: { output: 1 } })).toBe('verdict_for_unknown_node');
  });

  it('reads a resolved node as already delivered, not as no longer waiting', () => {
    const waits = new Map<string, NodeWaitState>([['gate', { status: 'resolved', resolution: { output: 'first' } }]]);
    expect(rejection({ nodeId: 'gate', resolution: { output: 1 } }, waits)).toBe('verdict_already_delivered');
  });

  it('rejects a known node that is not waiting', () => {
    expect(rejection({ nodeId: 'after', resolution: { output: 1 } })).toBe('node_not_waiting');
  });
});

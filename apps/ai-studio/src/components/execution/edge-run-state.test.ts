import { describe, expect, it } from 'vitest';

import type { NodeExecutionState, RunStatus } from '../../stores/use-execution-store';
import { edgeRunState } from './edge-run-state';

type Status = NodeExecutionState['status'] | undefined;

const node = (status: Status) => (status ? { status } : undefined);

describe('edgeRunState', () => {
  it.each<[string, Status, Status, RunStatus, string | undefined]>([
    ['no run draws the editing look', 'completed', 'running', 'idle', undefined],
    ['a running target', 'completed', 'running', 'running', 'running'],
    ['a skipped source wins over a running target', 'skipped', 'running', 'running', 'outOfRun'],
    ['a skipped source', 'skipped', undefined, 'running', 'outOfRun'],
    ['a skipped target', 'completed', 'skipped', 'running', 'outOfRun'],
    ['a completed target', 'completed', 'completed', 'running', 'completed'],
    ['a waiting target', 'completed', 'waiting', 'waiting', 'completed'],
    ['a failed target', 'completed', 'failed', 'running', 'completed'],
    ['a reached target after the run ended', 'completed', 'completed', 'completed', 'completed'],
    ['an unreached target after the run completed', 'completed', undefined, 'completed', 'outOfRun'],
    ['an unreached target after the run failed', 'failed', undefined, 'failed', 'outOfRun'],
    ['an unreached target after the run was incomplete', undefined, undefined, 'incomplete', 'outOfRun'],
    ['after Stop the target settled to idle', 'completed', 'idle', 'cancelled', 'outOfRun'],
    ['a live run with an idle target', 'completed', 'idle', 'running', 'pending'],
    ['a live run before either end started', undefined, undefined, 'pending', 'pending'],
    ['a running source', 'running', undefined, 'running', 'pending'],
    ['a lost stream counts as a live run', 'completed', undefined, 'disconnected', 'pending'],
  ])('%s', (_, source, target, run, expected) => {
    expect(edgeRunState(node(source), node(target), run)).toBe(expected);
  });

  it.each<[string, Status, Status, string]>([
    ['D to B', 'completed', 'skipped', 'outOfRun'],
    ['B to C', 'skipped', 'skipped', 'outOfRun'],
    ['C to E', 'skipped', 'skipped', 'outOfRun'],
  ])('leaves the branch not taken out of the run: %s', (_, source, target, expected) => {
    expect(edgeRunState(node(source), node(target), 'running')).toBe(expected);
  });

  it.each<[string, Status, Status, string]>([
    ['A to ErrorBranch', 'completed', 'skipped', 'outOfRun'],
    ['ErrorBranch to Cleanup', 'skipped', 'skipped', 'outOfRun'],
  ])('leaves the unused error branch of a healthy run out of the run: %s', (_, source, target, expected) => {
    expect(edgeRunState(node(source), node(target), 'running')).toBe(expected);
  });

  it.each<[string, Status, Status, RunStatus, string]>([
    ['Review to running Send', 'completed', 'running', 'running', 'running'],
    ['skipped Senior Review to running Send', 'skipped', 'running', 'running', 'outOfRun'],
    ['Review to completed Send', 'completed', 'completed', 'completed', 'completed'],
    ['skipped Senior Review to completed Send', 'skipped', 'completed', 'completed', 'outOfRun'],
  ])('moves only along the taken input of a join: %s', (_, source, target, run, expected) => {
    expect(edgeRunState(node(source), node(target), run)).toBe(expected);
  });

  it.each<[string, Status, Status, RunStatus, string]>([
    ['while the run is live', undefined, 'running', 'running', 'pending'],
    ['once the run ended', undefined, 'completed', 'completed', 'outOfRun'],
  ])('does not move into a running target before its source finished, %s', (_, source, target, run, expected) => {
    expect(edgeRunState(node(source), node(target), run)).toBe(expected);
  });

  describe('a decision that took "yes", with "no" wired straight into the join', () => {
    const decision: NodeExecutionState = { status: 'completed', nextPort: 'yes' };

    it.each<[string, Status, RunStatus, string]>([
      ['the join is idle', 'idle', 'running', 'outOfRun'],
      ['the join runs through the other input', 'running', 'running', 'outOfRun'],
      ['the run completed', 'completed', 'completed', 'outOfRun'],
    ])('leaves the "no" edge out of the run when %s', (_, target, run, expected) => {
      expect(edgeRunState(decision, node(target), run, 'no')).toBe(expected);
    });

    it('moves along the "yes" edge', () => {
      expect(edgeRunState(decision, node('running'), 'running', 'yes')).toBe('running');
    });
  });

  it.each<[string, NodeExecutionState, string | undefined, Status, string]>([
    [
      'the error edge of a routed failure',
      { status: 'failed', nextPort: 'errorRoute' },
      'errorRoute',
      'running',
      'running',
    ],
    [
      'the success edge of a routed failure',
      { status: 'failed', nextPort: 'errorRoute' },
      undefined,
      'completed',
      'outOfRun',
    ],
    ['the error edge of a healthy node', { status: 'completed' }, 'errorRoute', 'running', 'outOfRun'],
    ['the edge out of a failure absorbed by continue', { status: 'failed' }, undefined, 'completed', 'completed'],
  ])('follows the error policy: %s', (_, source, sourceHandle, target, expected) => {
    expect(edgeRunState(source, node(target), 'running', sourceHandle)).toBe(expected);
  });

  it('treats a source without a recorded port, as in runs before it was emitted, as leaving through every edge', () => {
    expect(edgeRunState({ status: 'completed' }, node('completed'), 'completed', 'no')).toBe('completed');
  });

  it('treats the error edge of a failure without a recorded port, as in runs before it was emitted, as taken', () => {
    expect(edgeRunState({ status: 'failed' }, node('completed'), 'completed', 'errorRoute')).toBe('completed');
  });
});

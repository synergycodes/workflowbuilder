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
});

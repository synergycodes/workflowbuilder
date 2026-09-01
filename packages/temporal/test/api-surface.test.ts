// The published surface, pinned. Renames and removals after publish are breaking
// changes, and this package's public API is what Temporal reviews — so this list
// changes only deliberately, never as a side effect of a refactor.
//
// Types are absent on purpose: only runtime bindings show up at all. The exports
// *map* (three subpaths resolving to the right files) is covered by publint and
// arethetypeswrong in CI.
import { describe, expect, it } from 'vitest';

import * as clientEntry from '../src/client/index';
import * as rootEntry from '../src/index';
import * as workflowEntry from '../src/workflow/index';

describe('public API surface', () => {
  it('the root entry exports exactly this', () => {
    expect(Object.keys(rootEntry).sort()).toEqual([
      'DEFAULT_DATABASE_ACTIVITY_PROFILE',
      'DEFAULT_NODE_ACTIVITY_PROFILE',
      'DEFAULT_TASK_QUEUE',
      'NodeExecutionError',
      'RUN_WORKFLOW_NAME',
      'WorkflowBuilderPlugin',
      'createActivities',
      'executionWorkflowId',
    ]);
  });

  it('the client entry exports exactly this', () => {
    expect(Object.keys(clientEntry).sort()).toEqual(['TemporalWorkflowEngine']);
  });

  it('the workflow entry exports exactly this', () => {
    expect(Object.keys(workflowEntry).sort()).toEqual([
      'DEFAULT_DATABASE_ACTIVITY_PROFILE',
      'DEFAULT_NODE_ACTIVITY_PROFILE',
      'createRunWorkflow',
      'createSequencedEventEmitter',
      'resolveNodeActivityOptions',
      'runWorkflow',
    ]);
  });

  it('names the workflow the client starts after the function the sandbox registers', () => {
    // A drift here strands every in-flight run: the client would start a name no
    // worker serves.
    expect(rootEntry.RUN_WORKFLOW_NAME in workflowEntry).toBe(true);
    expect(rootEntry.RUN_WORKFLOW_NAME).toBe('runWorkflow');
  });
});

describe('default activity profiles', () => {
  // These are the values the worker has always used. Per-node-type profiles layer on
  // top; a node type without metadata has to keep resolving to exactly this, never to
  // Temporal's own default of unlimited retries with backoff. That resolution is
  // pinned in src/workflow/node-activity-options.test.ts.
  it('keeps node activities at 10 minutes and 2 attempts', () => {
    expect(rootEntry.DEFAULT_NODE_ACTIVITY_PROFILE).toEqual({
      startToCloseTimeout: '10m',
      retry: { maximumAttempts: 2 },
    });
  });

  it('keeps database activities at 30 seconds and 5 attempts', () => {
    expect(rootEntry.DEFAULT_DATABASE_ACTIVITY_PROFILE).toEqual({
      startToCloseTimeout: '30s',
      retry: { maximumAttempts: 5 },
    });
  });
});

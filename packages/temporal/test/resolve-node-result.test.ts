import {
  ApplicationFailure,
  WorkflowNotFoundError,
  WorkflowUpdateFailedError,
  WorkflowUpdateRPCTimeoutOrCancelledError,
} from '@temporalio/client';
import { describe, expect, it } from 'vitest';

import { mapResolveNodeError } from '../src/client/resolve-node-result';

function updateFailed(cause?: Error): WorkflowUpdateFailedError {
  return new WorkflowUpdateFailedError('Workflow Update failed', cause);
}

function rejection(type: string, message: string): ApplicationFailure {
  return ApplicationFailure.create({ type, message, nonRetryable: true });
}

function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return 'did not throw';
}

describe('mapResolveNodeError', () => {
  it.each(['verdict_malformed', 'verdict_for_unknown_node', 'verdict_already_delivered', 'node_not_waiting'])(
    'answers the validator rejection %s as a result carrying its message',
    (code) => {
      const error = updateFailed(rejection(code, `because ${code}`));

      expect(mapResolveNodeError(error)).toEqual({ error: { code, message: `because ${code}` } });
    },
  );

  it('answers a run the server no longer has as run_not_found', () => {
    const error = new WorkflowNotFoundError('workflow execution already completed', 'execution-1', undefined);

    expect(mapResolveNodeError(error)).toEqual({
      error: { code: 'run_not_found', message: 'workflow execution already completed' },
    });
  });

  it('answers an abandoned RPC as delivery_timeout', () => {
    const error = new WorkflowUpdateRPCTimeoutOrCancelledError('Deadline exceeded');

    expect(mapResolveNodeError(error)).toEqual({ error: { code: 'delivery_timeout', message: 'Deadline exceeded' } });
  });

  it('rethrows an update failure whose type the port does not declare', () => {
    const error = updateFailed(rejection('handler_exploded', 'unexpected'));

    expect(thrownBy(() => mapResolveNodeError(error))).toBe(error);
  });

  it('rethrows an update failure with no ApplicationFailure behind it', () => {
    const error = updateFailed(new Error('not a failure'));

    expect(thrownBy(() => mapResolveNodeError(error))).toBe(error);
  });

  it('rethrows an update failure without a cause', () => {
    const error = updateFailed();

    expect(thrownBy(() => mapResolveNodeError(error))).toBe(error);
  });

  it('rethrows anything that is not a delivery outcome', () => {
    const error = new Error('connection refused');

    expect(thrownBy(() => mapResolveNodeError(error))).toBe(error);
  });
});

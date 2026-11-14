import { ApplicationFailure } from '@temporalio/workflow';

import { NodeExecutionError } from '@workflow-builder/execution-core';

export function bridgeNodeExecutionError(error: unknown): unknown {
  if (!(error instanceof NodeExecutionError)) return error;

  // Plain Error subclasses are converted by Temporal with their constructor
  // name but without custom fields. Carry the stable code in a marked detail;
  // the sandbox-side core can recover it without mistaking every unrelated
  // ApplicationFailure.type for a node error code.
  return ApplicationFailure.nonRetryable(error.message, 'NodeExecutionError', { code: error.code });
}

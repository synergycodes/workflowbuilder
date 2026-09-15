import {
  ApplicationFailure,
  WorkflowNotFoundError,
  WorkflowUpdateFailedError,
  WorkflowUpdateRPCTimeoutOrCancelledError,
} from '@temporalio/client';

import { RESOLVE_NODE_REJECTIONS, type ResolveNodeRejection, type ResolveNodeResult } from '../core-contract';

function isRejection(type: string): type is ResolveNodeRejection {
  return (RESOLVE_NODE_REJECTIONS as readonly string[]).includes(type);
}

// Turns the errors a verdict delivery can end in into the port's result. Anything the
// port has no code for is rethrown: a bug to surface, not a code to invent.
export function mapResolveNodeError(error: unknown): ResolveNodeResult {
  if (error instanceof WorkflowUpdateFailedError && error.cause instanceof ApplicationFailure) {
    const { type, message } = error.cause;
    if (typeof type === 'string' && isRejection(type)) {
      return { error: { code: type, message } };
    }
  }
  if (error instanceof WorkflowNotFoundError) {
    return { error: { code: 'run_not_found', message: error.message } };
  }
  if (error instanceof WorkflowUpdateRPCTimeoutOrCancelledError) {
    return { error: { code: 'delivery_timeout', message: error.message } };
  }
  throw error;
}

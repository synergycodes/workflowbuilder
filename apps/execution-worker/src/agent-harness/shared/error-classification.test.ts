import { describe, expect, it } from 'vitest';

import {
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
} from '@workflow-builder/execution-core';

import { classifyError, toHostNodeExecutionError } from './error-classification';

describe('classifyError', () => {
  it('classifies an auth-style error as FATAL', () => {
    expect(classifyError(new Error('401 unauthorized'))).toBe('FATAL');
  });

  it('classifies ECONNRESET as TRANSIENT', () => {
    expect(classifyError(new Error('read ECONNRESET'))).toBe('TRANSIENT');
  });

  it('classifies a mixed auth+process-exit message as FATAL, not TRANSIENT', () => {
    // Regression guard: FATAL_PATTERNS must be checked before TRANSIENT_PATTERNS.
    // "unauthorized" (FATAL) and "exited with code" (TRANSIENT) both match here;
    // swapping the check order would flip this to TRANSIENT and cause a retry
    // of a non-retryable auth failure.
    expect(classifyError(new Error('unauthorized: process exited with code 1'))).toBe('FATAL');
  });

  it('classifies an unrecognized error as UNKNOWN', () => {
    expect(classifyError(new Error('something completely unexpected happened'))).toBe('UNKNOWN');
  });
});

describe('toHostNodeExecutionError', () => {
  it('maps FATAL to PermanentNodeExecutionError', () => {
    const error = toHostNodeExecutionError('FATAL', 'agent_harness.fatal', 'auth failed');
    expect(error).toBeInstanceOf(PermanentNodeExecutionError);
    expect(error.code).toBe('agent_harness.fatal');
  });

  it('maps TRANSIENT to TransientNodeExecutionError', () => {
    const error = toHostNodeExecutionError('TRANSIENT', 'agent_harness.transient', 'connection reset');
    expect(error).toBeInstanceOf(TransientNodeExecutionError);
    expect(error.code).toBe('agent_harness.transient');
  });

  it('maps UNKNOWN to a plain NodeExecutionError', () => {
    const error = toHostNodeExecutionError('UNKNOWN', 'agent_harness.unknown', 'no idea');
    expect(error).toBeInstanceOf(NodeExecutionError);
    expect(error).not.toBeInstanceOf(PermanentNodeExecutionError);
    expect(error).not.toBeInstanceOf(TransientNodeExecutionError);
  });
});

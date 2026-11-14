import { ApplicationFailure } from '@temporalio/workflow';
import { describe, expect, it } from 'vitest';

import { NodeExecutionError } from '@workflow-builder/execution-core';

import { bridgeNodeExecutionError } from './node-execution-error-bridge';

describe('bridgeNodeExecutionError', () => {
  it('maps a structured executor error to Temporal ApplicationFailure.type', () => {
    const bridged = bridgeNodeExecutionError(new NodeExecutionError('ai_provider_not_configured', 'No provider'));

    expect(bridged).toBeInstanceOf(ApplicationFailure);
    expect(bridged).toMatchObject({
      type: 'NodeExecutionError',
      message: 'No provider',
      nonRetryable: true,
      details: [{ code: 'ai_provider_not_configured' }],
    });
  });

  it('leaves non-structured failures untouched', () => {
    const error = new Error('transient');
    expect(bridgeNodeExecutionError(error)).toBe(error);
  });
});

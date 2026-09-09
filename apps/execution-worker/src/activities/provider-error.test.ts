import { APICallError, RetryError } from 'ai';
import { describe, expect, it } from 'vitest';

import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflow-builder/execution-core';

import { classifyProviderError } from './provider-error';

function providerError(statusCode?: number, message = 'provider said no'): APICallError {
  return new APICallError({
    message,
    url: 'https://model.invalid/chat/completions',
    requestBodyValues: {},
    statusCode,
  });
}

describe('classifyProviderError', () => {
  it.each([
    [400, 'provider_rejected_request'],
    [401, 'provider_auth_rejected'],
    [402, 'provider_rejected_request'],
    [403, 'provider_auth_rejected'],
    [404, 'provider_rejected_request'],
    [413, 'provider_rejected_request'],
    [422, 'provider_rejected_request'],
  ])('HTTP %i is permanent with code %s', (status, code) => {
    const classified = classifyProviderError(providerError(status));

    expect(classified).toBeInstanceOf(PermanentNodeExecutionError);
    expect(classified).toMatchObject({
      code,
      classification: 'permanent',
      message: expect.stringContaining(`HTTP ${status}`),
    });
  });

  it.each([
    [408, 'provider_unreachable'],
    [429, 'provider_rate_limited'],
    [500, 'provider_unavailable'],
    [502, 'provider_unavailable'],
    [503, 'provider_unavailable'],
    [529, 'provider_unavailable'],
  ])('HTTP %i is transient with code %s', (status, code) => {
    const classified = classifyProviderError(providerError(status));

    expect(classified).toBeInstanceOf(TransientNodeExecutionError);
    expect(classified).toMatchObject({
      code,
      classification: 'transient',
      message: expect.stringContaining(`HTTP ${status}`),
    });
  });

  it('a provider error without a status code (the connection failed) is transient', () => {
    const classified = classifyProviderError(providerError());

    expect(classified).toBeInstanceOf(TransientNodeExecutionError);
    expect(classified).toMatchObject({ code: 'provider_unreachable', classification: 'transient' });
  });

  it('classifies the provider error inside a RetryError, so SDK retries do not hide the status', () => {
    const original = providerError(401);
    const wrapped = new RetryError({
      message: 'Failed after 3 attempts',
      reason: 'maxRetriesExceeded',
      errors: [original],
    });

    expect(classifyProviderError(wrapped)).toMatchObject({ code: 'provider_auth_rejected', cause: original });
  });

  it("keeps the provider's own error as the cause, so node_failed still shows the provider's text", () => {
    const original = providerError(401, 'Incorrect API key provided');

    expect(classifyProviderError(original)).toMatchObject({ cause: original });
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a non-error value', 'boom'],
    ['an object that merely looks like an API error', { statusCode: 500, message: 'not from the SDK' }],
  ])('passes %s through unclassified', (_label, error) => {
    expect(classifyProviderError(error)).toBe(error);
  });
});

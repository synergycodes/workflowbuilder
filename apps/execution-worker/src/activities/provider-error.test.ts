import { RetryError } from 'ai';
import { describe, expect, it } from 'vitest';

import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflow-builder/execution-core';

import { apiCallError } from './api-call-error.fixture';
import { classifyProviderError } from './provider-error';

describe('classifyProviderError', () => {
  it.each([
    [400, PermanentNodeExecutionError, 'provider_rejected_request'],
    [401, PermanentNodeExecutionError, 'provider_auth_rejected'],
    [402, PermanentNodeExecutionError, 'provider_rejected_request'],
    [403, PermanentNodeExecutionError, 'provider_auth_rejected'],
    [404, PermanentNodeExecutionError, 'provider_rejected_request'],
    [409, PermanentNodeExecutionError, 'provider_rejected_request'],
    [413, PermanentNodeExecutionError, 'provider_rejected_request'],
    [422, PermanentNodeExecutionError, 'provider_rejected_request'],
    [408, TransientNodeExecutionError, 'provider_unreachable'],
    [429, TransientNodeExecutionError, 'provider_rate_limited'],
    [500, TransientNodeExecutionError, 'provider_unavailable'],
    [502, TransientNodeExecutionError, 'provider_unavailable'],
    [503, TransientNodeExecutionError, 'provider_unavailable'],
    [529, TransientNodeExecutionError, 'provider_unavailable'],
  ])('HTTP %i becomes a %o with code %s', (status, ErrorClass, code) => {
    const classified = classifyProviderError(apiCallError(status));

    expect(classified).toBeInstanceOf(ErrorClass);
    expect(classified).toMatchObject({ code, message: expect.stringContaining(`HTTP ${status}`) });
  });

  it('a provider error without a status code (the connection failed) is transient', () => {
    const classified = classifyProviderError(apiCallError());

    expect(classified).toBeInstanceOf(TransientNodeExecutionError);
    expect(classified).toMatchObject({ code: 'provider_unreachable' });
  });

  it('classifies the provider error inside a RetryError, so SDK retries do not hide the status', () => {
    const original = apiCallError(401);
    const wrapped = new RetryError({
      message: 'Failed after 3 attempts',
      reason: 'maxRetriesExceeded',
      errors: [original],
    });

    expect(classifyProviderError(wrapped)).toMatchObject({ code: 'provider_auth_rejected', cause: original });
  });

  it("keeps the provider's own error as the cause, so node_failed still shows the provider's text", () => {
    const original = apiCallError(401, 'Incorrect API key provided');

    expect(classifyProviderError(original)).toMatchObject({ cause: original });
  });

  it('passes a 2xx the SDK could not parse through unclassified', () => {
    // The SDK reports a proxy answering with HTML as an APICallError carrying the 200.
    const unparsable = apiCallError(200, 'Failed to process successful response');

    expect(classifyProviderError(unparsable)).toBe(unparsable);
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a non-error value', 'boom'],
    ['an object that merely looks like an API error', { statusCode: 500, message: 'not from the SDK' }],
  ])('passes %s through unclassified', (_label, error) => {
    expect(classifyProviderError(error)).toBe(error);
  });
});

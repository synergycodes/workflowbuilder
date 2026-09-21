import { APICallError, InvalidToolInputError, NoOutputGeneratedError, RetryError } from 'ai';
import { describe, expect, it } from 'vitest';

import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflow-builder/execution-core';

import { apiCallError } from './api-call-error.fixture';
import { classifyProviderError } from './provider-error';

function retryError(errors: Error[]): RetryError {
  return new RetryError({ message: 'Failed after 3 attempts', reason: 'maxRetriesExceeded', errors });
}

// Mirrors how the SDK renders a failed fetch: its own text plus the caught error's
// message — which is where the dangling colon comes from when there is none.
function unreachable(cause: Error): APICallError {
  return new APICallError({
    message: `Cannot connect to API: ${cause.message}`,
    url: 'http://localhost:11434/v1/chat/completions',
    requestBodyValues: {},
    cause,
  });
}

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
    const original = apiCallError();
    const classified = classifyProviderError(original);

    expect(classified).toBeInstanceOf(TransientNodeExecutionError);
    expect(classified).toMatchObject({ code: 'provider_unreachable', cause: original });
  });

  it('reports the refused address rather than the SDK text that has none', () => {
    // A local provider being down: fetch tries both addresses and reports them in an
    // AggregateError of its own, which has no message.
    // eslint-disable-next-line unicorn/error-message -- the empty message is the shape under test
    const refused = new AggregateError([
      new Error('connect ECONNREFUSED ::1:11434'),
      new Error('connect ECONNREFUSED 127.0.0.1:11434'),
    ]);

    const classified = classifyProviderError(unreachable(refused));

    // The cause is what node_failed shows: the runner reports the deepest non-empty
    // message, and "Cannot connect to API: " would otherwise be the last one standing.
    expect(classified).toMatchObject({ code: 'provider_unreachable', cause: refused.errors[0] });
  });

  it('keeps the provider error when the connection failure named a reason itself', () => {
    const named = unreachable(new AggregateError([new Error('read ECONNRESET')], 'socket hang up'));

    expect(classifyProviderError(named)).toMatchObject({ cause: named });
  });

  it('keeps the provider error when no entry named a reason either', () => {
    // eslint-disable-next-line unicorn/error-message -- the empty messages are the shape under test
    const blank = unreachable(new AggregateError([new Error()]));

    expect(classifyProviderError(blank)).toMatchObject({ cause: blank });
  });

  it('classifies the provider error inside a RetryError, so SDK retries do not hide the status', () => {
    const original = apiCallError(401);

    expect(classifyProviderError(retryError([original]))).toMatchObject({
      code: 'provider_auth_rejected',
      cause: original,
    });
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

  // Raised without any provider response, so they describe model behaviour a retry can
  // change. Built from the real SDK classes the README names, not from look-alikes.
  it.each([
    ['produced no output', new NoOutputGeneratedError({ message: 'No output generated.' })],
    [
      'called a tool with malformed input',
      new InvalidToolInputError({
        toolName: 'webSearch',
        toolInput: '{"query":',
        cause: new Error('Unexpected end of JSON input'),
      }),
    ],
  ])('passes an SDK error saying the model %s through unclassified', (_label, error) => {
    expect(classifyProviderError(error)).toBe(error);
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a non-error value', 'boom'],
    ['an object that merely looks like an API error', { statusCode: 500, message: 'not from the SDK' }],
    ['a status below the 4xx floor', apiCallError(0)],
    ['a redirect the SDK could not follow', apiCallError(302)],
    ['a RetryError whose last error is not a provider response', retryError([new Error('mock exploded')])],
    ['a RetryError that captured no error at all', retryError([])],
  ])('passes %s through unclassified', (_label, error) => {
    expect(classifyProviderError(error)).toBe(error);
  });
});

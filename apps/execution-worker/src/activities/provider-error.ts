import { APICallError, RetryError } from 'ai';

import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflow-builder/execution-core';

// The judgment for the AI Agent's provider failures lives here, at the throw
// site, and nowhere central: the runner and the adapter never read a status.
// Anything that is not a provider response passes through unclassified.
export function classifyProviderError(error: unknown): unknown {
  // With SDK retries enabled the provider error arrives wrapped in a RetryError;
  // unwrap it so the status stays readable if maxRetries ever leaves 0.
  const providerError = RetryError.isInstance(error) ? error.lastError : error;
  if (!APICallError.isInstance(providerError)) return error;

  const status = providerError.statusCode;
  const options = { cause: providerError };

  if (status === undefined) {
    return new TransientNodeExecutionError('provider_unreachable', 'Could not reach the provider', options);
  }
  if (status === 408) {
    return new TransientNodeExecutionError('provider_unreachable', 'Provider timed out (HTTP 408)', options);
  }
  if (status === 429) {
    return new TransientNodeExecutionError('provider_rate_limited', 'Provider rate limit hit (HTTP 429)', options);
  }
  if (status >= 500) {
    return new TransientNodeExecutionError(
      'provider_unavailable',
      `Provider failed to serve the request (HTTP ${status})`,
      options,
    );
  }
  if (status === 401 || status === 403) {
    return new PermanentNodeExecutionError(
      'provider_auth_rejected',
      `Provider rejected the API key (HTTP ${status})`,
      options,
    );
  }
  if (status >= 400) {
    return new PermanentNodeExecutionError(
      'provider_rejected_request',
      `Provider rejected the request (HTTP ${status})`,
      options,
    );
  }
  return error;
}

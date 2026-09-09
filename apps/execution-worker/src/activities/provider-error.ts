import { APICallError } from 'ai';

import { PermanentNodeExecutionError, TransientNodeExecutionError } from '@workflow-builder/execution-core';

// The judgment for the AI Agent's provider failures lives here, at the throw
// site, and nowhere central: the runner and the adapter never read a status.
// Anything that is not a provider response passes through unclassified.
export function classifyProviderError(error: unknown): unknown {
  if (!APICallError.isInstance(error)) return error;

  const status = error.statusCode;
  const options = { cause: error };

  if (status === undefined) {
    return new TransientNodeExecutionError('provider_unreachable', 'Provider did not answer the request', options);
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

import { APICallError } from 'ai';

export function apiCallError(statusCode?: number, message = 'provider said no'): APICallError {
  return new APICallError({
    message,
    url: 'https://model.invalid/chat/completions',
    requestBodyValues: {},
    statusCode,
  });
}

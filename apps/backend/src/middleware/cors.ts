import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';

// Null opens the API to every origin; a list admits exactly those, so an empty list admits none.
export function createCorsMiddleware(allowedOrigins: string[] | null): MiddlewareHandler {
  return allowedOrigins === null ? cors() : cors({ origin: allowedOrigins });
}

import type { Context, MiddlewareHandler } from 'hono';

import type { AuthAction, AuthPort, AuthResource, CallerIdentity } from './auth-port';

export type AuthVariables = {
  caller: CallerIdentity | null;
};

/**
 * Identify the caller once per request and stash it on the Hono context.
 * Downstream handlers call the `authorize` function returned by
 * {@link makeAuthorize} for each sensitive operation.
 */
export function createAuthMiddleware(authPort: AuthPort): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const caller = await authPort.identify(c.req.raw);
    c.set('caller', caller);
    await next();
  };
}

/**
 * Bind an {@link AuthPort} to a reusable `authorize` function that handlers
 * call before sensitive operations. Returning a function (rather than passing
 * the port through Hono context) keeps the port a boot-time singleton and
 * removes the temptation to swap it mid-request.
 *
 * The returned function resolves to a `Response` (401 if no caller was
 * identified, 403 otherwise) when access is denied — `null` when the caller
 * is authorized and the route should proceed. Handlers use the early-return
 * idiom:
 *
 * ```ts
 * const authorize = makeAuthorize(authPort);
 * // ...
 * const denied = await authorize(c, 'workflows:read', { kind: 'workflow', workflowId: id });
 * if (denied) return denied;
 * ```
 *
 * Caveat: forgetting `if (denied) return denied;` silently lets the request
 * through. There is no TypeScript signal for the missed return today — a
 * stricter "throw-on-deny + Hono onError" wiring is on the follow-up list
 * (see auth-port.decision-log.md).
 */
export type Authorize = (
  c: Context<{ Variables: AuthVariables }>,
  action: AuthAction,
  resource: AuthResource,
) => Promise<Response | null>;

export function makeAuthorize(authPort: AuthPort): Authorize {
  return async (c, action, resource) => {
    const caller = c.var.caller;
    const allowed = await authPort.authorize(caller, action, resource);
    if (allowed) return null;
    if (!caller) {
      return c.json({ code: 'unauthenticated', message: 'Authentication required' }, 401);
    }
    return c.json({ code: 'forbidden', message: `Action ${action} not permitted` }, 403);
  };
}

import type { Context, MiddlewareHandler } from 'hono';

import { type AuthAction, AuthDeniedError, type AuthPort, type AuthResource, type CallerIdentity } from './auth-port';

export type AuthVariables = {
  caller: CallerIdentity | null;
};

/**
 * Identify the caller once per request and stash it on the Hono context.
 * Downstream handlers call the `assertAuthorized` function returned by
 * {@link makeAssertAuthorized} for each sensitive operation.
 */
export function createAuthMiddleware(authPort: AuthPort): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const caller = await authPort.identify(c.req.raw);
    c.set('caller', caller);
    await next();
  };
}

/**
 * Bind an {@link AuthPort} to a reusable `assertAuthorized` function that
 * handlers call before sensitive operations. Returning a function (rather
 * than passing the port through Hono context) keeps the port a boot-time
 * singleton and removes the temptation to swap it mid-request.
 *
 * On deny, the function throws {@link AuthDeniedError}. The `onError` handler
 * registered in `server.ts` maps it to 401 (anonymous caller) or 403
 * (authenticated but forbidden). Handlers do not need to remember to forward
 * a `Response`:
 *
 * ```ts
 * const assertAuthorized = makeAssertAuthorized(authPort);
 * // ...
 * await assertAuthorized(c, 'workflows:read', { kind: 'workflow', workflowId: id });
 * // proceed - if we got here, the caller is authorized
 * ```
 */
// Generic over the context's `Variables` (constrained to extend AuthVariables)
// so a route can compose auth with other per-request seams, e.g. run under
// `AuthVariables & TenantVariables`. Hono's `Context.set` is invariant in
// `Variables`, so a fixed `Context<{ Variables: AuthVariables }>` parameter
// would reject any widened context. Do not narrow this back to a concrete type.
export type AssertAuthorized = <V extends AuthVariables>(
  c: Context<{ Variables: V }>,
  action: AuthAction,
  resource: AuthResource,
) => Promise<void>;

export function makeAssertAuthorized(authPort: AuthPort): AssertAuthorized {
  return async (c, action, resource) => {
    const caller = c.var.caller;
    const allowed = await authPort.authorize(caller, action, resource);
    if (!allowed) throw new AuthDeniedError(caller, action, resource);
  };
}

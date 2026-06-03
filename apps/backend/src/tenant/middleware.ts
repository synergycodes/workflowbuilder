import type { Context, MiddlewareHandler } from 'hono';

import type { TenantContext, TenantContextPort } from './tenant-context-port';

/**
 * Stash for the resolved tenant on a Hono request context. `null` means the
 * configured {@link TenantContextPort} did not identify a tenant for this
 * request (e.g. health check, single-tenant reference mode). Routes that
 * require a tenant use {@link requireTenant}.
 */
export type TenantVariables = {
  tenant: TenantContext | null;
};

/**
 * Identify the tenant once per request and stash it on the Hono context.
 * Routes downstream read `c.var.tenant`. With the default
 * `NoopTenantContextPort`, every request lands with `tenant === null` —
 * the reference backend is single-tenant — and downstream code treats that
 * as the standard case.
 */
export function createTenantMiddleware(port: TenantContextPort): MiddlewareHandler<{ Variables: TenantVariables }> {
  return async (c, next) => {
    c.set('tenant', await port.resolve(c.req.raw));
    await next();
  };
}

/**
 * Convenience for routes that REQUIRE a tenant. Returns the `TenantContext`
 * to use, or a 400 `Response` if no tenant was resolved. Use the early-return
 * idiom:
 *
 * ```ts
 * const tenant = requireTenant(c);
 * if (tenant instanceof Response) return tenant;
 * // tenant is TenantContext from here on
 * ```
 *
 * In the reference (single-tenant) setup with `NoopTenantContextPort`, this
 * helper always short-circuits to 400 — which is fine, because no route in
 * the reference backend currently calls it. Multi-tenant consumers call it
 * from routes that should reject tenant-less callers.
 */
export function requireTenant(c: Context<{ Variables: TenantVariables }>): TenantContext | Response {
  const tenant = c.var.tenant;
  if (!tenant) {
    return c.json({ code: 'tenant_required', message: 'Tenant context required' }, 400);
  }
  return tenant;
}

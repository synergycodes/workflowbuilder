/**
 * TenantContextPort — multi-tenant identity seam for the reference backend.
 *
 * The reference backend ships **single-tenant**. Real multi-tenant
 * deployments need to propagate a tenant identifier from the incoming HTTP
 * request, through workflow submission, into worker activities, and back
 * into event emission and SSE streams. This port surfaces the seam without
 * prescribing **how** a tenant is resolved — adapters can pick subdomain,
 * `X-Tenant-Id` header, JWT claim, session lookup, anything.
 *
 * Why a port and not a one-off helper: tenant identity has to flow through
 * five different boundaries (HTTP, route handlers, workflow engine, worker
 * activities, persistence). Without an explicit seam, multi-tenancy ends up
 * as a cross-cutting hack scattered across the codebase. A typo at any
 * boundary is a security incident — one tenant reading another's data.
 *
 * Implementations must not throw for "no tenant" — return `null`. Routes
 * decide whether anonymous-tenant traffic is allowed (rejecting `null` on
 * scoped routes, accepting it on health checks).
 */

export type TenantContext = {
  /**
   * Stable tenant identifier, an opaque string (UUID or slug). Persisted as
   * `text` in `executions.tenant_id`, so any string the adapter returns round
   * trips. Consumers that need richer per-tenant data (plan tier, region,
   * flags) extend this type in their own adapter.
   */
  readonly tenantId: string;
};

export interface TenantContextPort {
  /**
   * Resolve the tenant for an incoming request.
   *
   * - Return a {@link TenantContext} when the request carries enough signal
   *   to identify a tenant.
   * - Return `null` for tenant-less requests (e.g. `/api/health`, public
   *   landing pages). Scoped routes treat `null` as 4xx; non-scoped routes
   *   accept it.
   *
   * Throw only for unexpected failures — the tenant-store is down, the
   * subdomain DNS lookup timed out, the JWT verifier choked on JWKS.
   * "Could not determine tenant" is `null`, not an exception.
   */
  resolve(request: Request): Promise<TenantContext | null>;
}

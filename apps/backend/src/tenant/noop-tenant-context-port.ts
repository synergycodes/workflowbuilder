import type { TenantContext, TenantContextPort } from './tenant-context-port';

/**
 * Default {@link TenantContextPort} for the single-tenant reference backend:
 * resolves to `null` on every request. The reference backend operates as a
 * single logical tenant, so attaching tenant context would be ceremony with
 * no enforcement.
 *
 * Multi-tenant consumers swap this for a real adapter that reads from a
 * subdomain (`https://acme.example.com/api/…`), a JWT claim, a header, a
 * session store, or whatever fits their identity model. See
 * `apps/backend/tenant-context-port.decision-log.md` for the integration
 * pattern (five seams: HTTP middleware, route propagation, persistence,
 * SSE filter, Postgres RLS) the port plugs into.
 */
export class NoopTenantContextPort implements TenantContextPort {
  async resolve(): Promise<TenantContext | null> {
    return null;
  }
}

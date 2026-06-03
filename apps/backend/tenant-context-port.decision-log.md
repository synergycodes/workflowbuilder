### Title: TenantContextPort — multi-tenant identity seam for the reference backend

### Proposed by: Kacper Cierzniewski

### Date: 21.05.2026

## Context

The reference backend (`apps/backend` + `apps/execution-worker`) ships **single-tenant**. Real-world multi-tenant deployments (the typical enterprise consumer) need to propagate a tenant identifier from the incoming HTTP request, through workflow submission, into worker activities, and back into event emission and SSE streams.

Without an explicit seam, multi-tenancy ends up as a cross-cutting hack scattered across the codebase: a `getTenantFromRequest(req)` helper called in 17 routes, a hand-rolled middleware, a `tenant_id` parameter quietly threaded through every executor, a `WHERE tenant_id = ?` clause every consumer remembers to add or forgets. Mistakes here are exactly the canonical multi-tenancy bug, one tenant reading another's data.

## Decision

Introduce `TenantContextPort` (`apps/backend/src/tenant/`), an interface with a single method `resolve(request)` that returns `TenantContext | null`, plus a default `NoopTenantContextPort` that resolves to `null` on every request.

**What actually ships (not docs, runtime code):** the reference backend wires four of the five seams below as no-ops. With `NoopTenantContextPort` the tenant is `null` on every request, so every wired seam degrades to its current single-tenant behaviour. A consumer makes the backend multi-tenant by swapping one line (the port instance), not by re-implementing the wiring. Seam 5 (Postgres RLS) is documented as a pattern only, because no sensible default policy exists across deployments (see its section).

The port:

- Lives in `apps/backend`, not in `packages/execution-core`. `execution-core` stays tenant-agnostic. If a consumer's node executors need tenant at runtime, the identifier is available to inject via the existing `ExecutionContext.variables` shape; the reference itself does not inject it (see seam 2).
- Ships with a `NoopTenantContextPort` default so the reference backend stays single-tenant out of the box, no enforcement, no ceremony.
- Is meant to be replaced by the consumer for any multi-tenant deployment.

The port itself is small on purpose. The wiring around it (the seams) is the actual contract, and it is where the value is.

## Responsibility boundary: TenantContextPort vs AuthPort

The backend has two identity seams and they own different things. Getting this split wrong is how the cross-tenant bug sneaks back in, so it is stated explicitly.

- **AuthPort owns per-resource authorization, including tenant ownership.** Every scoped route calls `assertAuthorized(c, action, { kind: 'execution', executionId })` before touching data. A real multi-tenant `AuthPort` checks that the caller may act on that specific resource, which in a multi-tenant deployment means "belongs to the caller's tenant". This is the single, systematic place resource scoping lives. Sprinkling `if (row.tenantId !== caller.tenantId)` into every route is the shotgun anti-pattern this design exists to avoid.
- **TenantContextPort owns identity propagation**, resolving the tenant once at the HTTP boundary and carrying it onto the execution row and (denormalised) event rows, so reads, the worker, and RLS can all scope by it.
- **The SSE stream cross-check is the one deliberate exception**, and it is defence-in-depth, not the general guard. `GET /:id/stream` cannot rely on a bearer token because EventSource cannot send an `Authorization` header, so its auth falls back to weaker query-param or cookie schemes. The tenant resolved by `TenantContextPort` (subdomain, cookie) gives an independent second check on exactly that weak path. `GET /:id` and `DELETE /:id` carry no such cross-check on purpose, they rely on `AuthPort` plus RLS.

Consequence a consumer must internalise: implementing `TenantContextPort` alone does **not** isolate tenants. It propagates identity. Isolation is `AuthPort` (app layer) plus RLS (DB layer). The seam map below is the full job.

## Integration patterns

Seams 1-4 below are shipped and wired in the reference (no-op under `NoopTenantContextPort`). Seam 5 is a documented pattern the consumer enables.

### Seam 1: HTTP middleware — resolve once per request (shipped)

`createTenantMiddleware` calls `tenantPort.resolve(c.req.raw)` once at the boundary and stashes the result on the request context. `requireTenant` is a shipped convenience for routes that must reject tenant-less callers. No reference route calls `requireTenant` today (the reference is single-tenant, so it would always 400); it ships and is tested because multi-tenant consumers call it from their scoped routes, and shipping plus testing it is cheaper than every consumer re-deriving the same early-return idiom.

```ts
// apps/backend/src/tenant/middleware.ts (shipped)
export function createTenantMiddleware(port: TenantContextPort): MiddlewareHandler<{ Variables: TenantVariables }> {
  return async (c, next) => {
    c.set('tenant', await port.resolve(c.req.raw));
    await next();
  };
}

export function requireTenant(c: Context<{ Variables: TenantVariables }>): TenantContext | Response {
  const tenant = c.var.tenant;
  if (!tenant) {
    return c.json({ code: 'tenant_required', message: 'Tenant context required' }, 400);
  }
  return tenant;
}
```

Wired in `server.ts` after the auth middleware (so route handlers run under `AuthVariables & TenantVariables`):

```ts
const tenantPort: TenantContextPort = new NoopTenantContextPort(); // swap for a real adapter
app.use('/api/*', createAuthMiddleware(authPort));
app.use('/api/*', createTenantMiddleware(tenantPort));
```

### Seam 2: route — propagate tenant into the execution (shipped)

`POST /workflows/:id/execute` reads the resolved tenant and stamps it onto the execution row at submission time. `null` in single-tenant mode. The worker reads it back from that row via subquery for event tagging (seam 3), so it never needs the value threaded through the run.

```ts
// apps/backend/src/routes/workflows.ts (shipped)
const tenantId = c.var.tenant?.tenantId ?? null;

await database.insert(executions).values({ /* … */, tenantId }).returning();

await getWorkflowEngine().submit({
  workflowId,
  executionId: execution.id,
  definition,
  triggerPayload: body.triggerPayload ?? {},
  variables: {}, // reference does NOT inject tenantId here, see below
  global: {},
});
```

**Consumer extension (not shipped):** if a consumer's node executors need the tenant at runtime, inject it into the engine `variables` bag (`variables: tenantId ? { tenantId } : {}`) and read it inside the executor as `context.variables.tenantId`. `execution-core` never reads the field, it is opaque transport. The reference omits this because no reference executor consumes it, shipping it would be dead transport.

### Seam 3: persistence — every row carries `tenant_id` (shipped)

A migration adds a **nullable** `text` `tenant_id` to `executions` and `execution_events` plus an index on each. Nullable on purpose: the reference and any pre-existing rows leave it `NULL`, and a `NOT NULL` column would refuse to apply against existing data without a backfill story the reference cannot assume. `text`, not `uuid`: `TenantContext.tenantId` is an opaque string (UUID or slug), so the column must store whatever the consumer's port returns. A consumer who knows their tenants are UUIDs can tighten it.

```sql
-- apps/backend/drizzle/0001_odd_iron_lad.sql (shipped)
ALTER TABLE "execution_events" ADD COLUMN "tenant_id" text;
ALTER TABLE "executions"       ADD COLUMN "tenant_id" text;
CREATE INDEX "execution_events_tenant_id_idx" ON "execution_events" ("tenant_id");
CREATE INDEX "executions_tenant_id_idx"       ON "executions" ("tenant_id");
```

The worker inherits `tenant_id` for each event row from the parent execution via a correlated subquery at INSERT time, rather than threading `tenantId` through the workflow and every `emitEvent` call. This keeps the worker and the Temporal workflow fully tenant-agnostic (no new parameter, no per-call-site leak) and makes the event's tenant DB-guaranteed to match its parent:

```ts
// apps/execution-worker/src/database.ts (shipped)
await sql`
  INSERT INTO execution_events (..., tenant_id, ...)
  VALUES (..., (SELECT tenant_id FROM executions WHERE id = ${executionId}), ...)
`;
```

The cost is one indexed primary-key lookup per event insert. The benefit is that the worker never has to know tenancy exists.

### Seam 4: SSE stream filter — tenant of caller must match tenant of execution (shipped)

Before subscribing, `GET /:id/stream` checks the caller's tenant against the tenant stamped on the execution row. As noted in the responsibility-boundary section, this is defence-in-depth for EventSource's weaker auth, not the general per-resource guard.

```ts
// apps/backend/src/routes/executions.ts (shipped)
const tenant = c.var.tenant;
if (tenant && execution.tenantId && execution.tenantId !== tenant.tenantId) {
  // 404, byte-identical to the not-found branch, not 403. A distinct
  // "belongs to another tenant" response would confirm the id exists in
  // another tenant and make foreign executions enumerable.
  return c.json({ code: 'execution_not_found', message: 'Execution not found' }, 404);
}
```

The mismatch response is deliberately a 404 identical to not-found. Returning a recognisable 403 would leak existence across tenants, the caller could probe ids and learn which executions live in other tenants. Indistinguishable-from-absent is the only safe answer on the isolation boundary.

The `tenant && execution.tenantId &&` guards make the check a no-op when either side is `null`. That keeps the single-tenant reference behaving exactly as before, but it also means **untenanted rows (`tenant_id IS NULL`) are globally visible at the app layer**. For deployments where that is unacceptable, seam 5 (RLS) is the systematic fix; app-level checks alone are not enough.

### Seam 5: Postgres Row-Level Security — defence in depth (documented pattern, not shipped)

App-level scoping (`AuthPort` plus seams 2-4) is the primary enforcement. RLS is the safety net for the day a programmer forgets a `WHERE tenant_id` somewhere. It is **not** wired in the reference: enabling RLS under `NoopTenantContextPort` would compare a `NULL` session variable to a `NULL` column and silently return zero rows for every query, and the "right" policy shape (admin bypass? parent-tenant visibility? separate DB per tenant?) is consumer-specific. So it ships as a pattern, not code.

```sql
-- consumer migration
ALTER TABLE executions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY executions_tenant_isolation ON executions
  USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY events_tenant_isolation ON execution_events
  USING (tenant_id = current_setting('app.current_tenant', true));
```

Each HTTP request opens a transaction and sets the tenant:

```ts
// apps/backend/src/db/with-tenant.ts (consumer-authored)
export async function withTenantScope<T>(tenantId: string, run: (tx: typeof database) => Promise<T>): Promise<T> {
  return await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    return await run(tx);
  });
}
```

Notes:

- Migrations and superuser ops need a role with `BYPASSRLS`.
- `current_setting('app.current_tenant', true)` returns `NULL` when not set; policies should treat `NULL` as "no rows visible". This is exactly why RLS cannot be on by default in the single-tenant reference.
- The `pg_notify` payload must also carry tenant if the SSE dispatcher is to fan out per tenant without reloading the row.

## Alternative options considered

- **Bake tenancy into `execution-core`.** Rejected. The runner ships to consumers who may not be multi-tenant. Adding a `tenantId` field to `BaseNode` or `ExecutionContext` would force every adapter to know about tenants. The variables-bag transport keeps execution-core ignorant and the field optional.
- **Single inline `getTenant(request)` helper.** Rejected. A helper plus calls scattered across 17 routes is exactly the cross-cutting hack we want to avoid. A port plus middleware adds one indirection but survives swap-in scenarios (subdomain to JWT migration, multi-region tenant store changes) without touching every route.
- **Thread `tenantId` through the workflow to the event INSERT** (instead of the subquery in seam 3). Rejected. It re-introduces a per-call-site parameter the worker would have to carry and could forget, and couples the otherwise tenant-agnostic worker to tenancy. The subquery costs one indexed lookup per event and guarantees consistency with the parent row.
- **Per-tenant Temporal namespace.** Stronger isolation than RLS but multiplies operational cost and couples the application to Temporal. Out of scope. The port composes with namespace-per-tenant if a consumer chooses it.
- **Header-based vs subdomain-based tenant resolution.** Not our call. The port stays method-of-resolution-agnostic.

## Consequences

- **Pros**
  - **Reference stays single-tenant** with the no-op default; cloning and running the reference needs zero tenancy ceremony.
  - **Swap-one-line multi-tenancy for seams 1-4.** Wiring is shipped, not left as an exercise; the consumer replaces the port instance and implements seam 5.
  - **The five-seam map.** Consumers know exactly where to wire and why, and which seam owns what (see responsibility boundary).
  - **Independent of `AuthPort`.** `resolve()` takes the raw `Request`, so a tenant adapter never depends on auth having run, the two seams compose without coupling. A consumer whose tenant lives in a JWT claim parses it inside their own adapter. If they want to avoid parsing the token twice they can share it in their own combined middleware, but the reference does not couple the ports to do it for them.
  - **No execution-core change.** `execution-core` ships to non-multi-tenant consumers unchanged. The worker stays tenant-agnostic via the subquery.

- **Cons**
  - **Identity propagation is not isolation.** Implementing the port does not make the backend safe to expose to multiple tenants; that needs a real `AuthPort` and (recommended) RLS. The seam map and responsibility boundary spell this out, but it is a foot-gun if skimmed.
  - **Untenanted rows are app-layer visible.** The null-tolerant cross-check (required for single-tenant) means `tenant_id IS NULL` rows are not isolated until RLS is on.
  - **Tenant tagging of events depends on the `executions.tenant_id` subquery.** One indexed lookup per event insert, traded for a worker that stays fully tenant-agnostic. A consumer who needs tenant inside executors opts into the `variables` transport (seam 2) and accepts its type-unsafe string convention.

## Default: NoopTenantContextPort

```ts
import { NoopTenantContextPort, type TenantContextPort } from './tenant';

const tenantPort: TenantContextPort = new NoopTenantContextPort();
// resolves to null on every request — reference backend stays single-tenant
```

The reference routes consult the port through the wired seams, but with the no-op default every check degrades to its prior single-tenant behaviour. Switching to a real port is a consumer-side concern: implement the interface, point the `tenantPort` line at it, and enable seam 5.

## Follow-ups

- **AuthPort integration recipe**: document the JWT-claim pattern, including how a consumer can parse the token once in a combined middleware and share the result with both ports if they want to avoid double parsing. The ports stay request-only and independent by default.
- **Shipping a recipe RLS migration**: optionally provide the seam-5 policy as a starter under `apps/backend/migrations/recipes/multi-tenant.sql`, gated behind an env flag during `pnpm db:migrate`.
- **Temporal namespace-per-tenant**: separate decision log when a consumer needs stronger isolation than RLS provides.
- **Tenant context in `node_failed` payloads**: stamp tenant on event payloads so a sink can pivot logs by tenant without joining back to the executions table.

## Status

Accepted. Port plus `NoopTenantContextPort` default plus seams 1-4 wired as no-ops in the reference backend; seam 5 (RLS) documented as a consumer-enabled pattern.

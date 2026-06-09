# Multi-tenancy: wiring the TenantContextPort seams

How to make the reference backend multi-tenant. For **why** it is shaped this way — the responsibility boundary, threat model, and rejected alternatives — read [`tenant-context-port.decision-log.md`](./tenant-context-port.decision-log.md) first. That document is stable; this one tracks the code, so signatures and file paths here are the live truth.

> **The headline rule:** implementing `TenantContextPort` propagates tenant _identity_. It does **not** isolate tenants. Isolation is `AuthPort` (app layer, see [`auth-port.decision-log.md`](./auth-port.decision-log.md)) + RLS (DB layer, seam 5). All five seams are the job.

## Seam status

| Seam | What it does                                                         | State                               | Code                                    | Tested  |
| ---- | -------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- | ------- |
| 1    | Resolve tenant once per request, stash on context                    | shipped (no-op default)             | `src/tenant/middleware.ts`              | ✅      |
| 2    | Stamp `tenantId` onto the execution row at submit                    | shipped (no-op default)             | `src/routes/workflows.ts`               | ✅      |
| 3    | Worker inherits `tenant_id` for each event from its parent execution | shipped (no-op default)             | `apps/execution-worker/src/database.ts` | ⚠️ none |
| 4    | SSE stream cross-check (defence-in-depth)                            | shipped (no-op default)             | `src/routes/executions.ts`              | ✅      |
| 5    | Postgres Row-Level Security                                          | **documented pattern, not shipped** | —                                       | —       |

"No-op default" means: under `NoopTenantContextPort` the tenant is `null` on every request, every seam degrades to single-tenant behaviour, and the reference runs with zero tenancy ceremony. Swap the port instance to turn seams 1–4 on; enable seam 5 yourself.

## Make it multi-tenant

Implement the port and point one line at it:

```ts
// src/server.ts — swap the no-op for your adapter
const tenantPort: TenantContextPort = new NoopTenantContextPort(); // ← your adapter here
app.use('/api/*', createAuthMiddleware(authPort));
app.use('/api/*', createTenantMiddleware(tenantPort)); // after auth: handlers run under AuthVariables & TenantVariables
```

Your adapter implements one method; how it resolves the tenant (subdomain, cookie, JWT claim) is your call:

```ts
interface TenantContextPort {
  resolve(request: Request): Promise<TenantContext | null>;
}
```

## The seams

### Seam 1 — HTTP middleware: resolve once per request

`createTenantMiddleware(port)` calls `port.resolve(c.req.raw)` once at the boundary and stashes the result under `c.var.tenant`. `requireTenant(c)` is a shipped convenience that returns a `400 tenant_required` for tenant-less callers — no reference route calls it (the single-tenant reference would always 400), but it ships tested so multi-tenant consumers do not re-derive the early-return idiom in every scoped route.

→ `src/tenant/middleware.ts` · `src/tenant/tenant-context-port.ts`

### Seam 2 — route: propagate tenant into the execution

`POST /workflows/:id/execute` reads `c.var.tenant?.tenantId ?? null` and stamps it onto the execution row at submission. The worker reads it back from that row (seam 3), so the tenant is **not** threaded through the run.

The reference deliberately does **not** inject the tenant into the engine `variables` bag — no reference executor consumes it, so that would be dead transport. If _your_ executors need the tenant at runtime, inject `variables: tenantId ? { tenantId } : {}` and read `context.variables.tenantId` inside the executor. `execution-core` never reads the field; it is opaque transport (and an untyped string convention — accept that trade-off).

→ `src/routes/workflows.ts`

### Seam 3 — persistence: every row carries `tenant_id`

Migration `0001_odd_iron_lad` adds a **nullable** `text` `tenant_id` to `executions` and `execution_events`, each indexed.

- **Nullable** on purpose: a `NOT NULL` column will not apply against existing rows without a backfill story the reference cannot assume.
- **`text`, not `uuid`**: `TenantContext.tenantId` is an opaque string (UUID or slug). A consumer who knows their ids are UUIDs can tighten it.

The worker inherits each event's `tenant_id` from its parent execution via a correlated subquery **at INSERT time** (`SELECT tenant_id FROM executions WHERE id = …`), rather than threading the value through the workflow and every `emitEvent` call. This keeps the worker and the Temporal workflow tenant-agnostic. Cost: one indexed primary-key lookup per event insert. The match holds _at insert time_ — it is not a maintained invariant, and **there is no test exercising it yet** (see the decision log's Verification status and follow-ups).

→ `apps/execution-worker/src/database.ts` · `drizzle/0001_odd_iron_lad.sql`

### Seam 4 — SSE stream cross-check (defence-in-depth)

Before subscribing, `GET /:id/stream` checks the caller's tenant against the tenant on the execution row. This is the one execution-row endpoint with a tenant guard, because EventSource's auth is weaker (no `Authorization` header) — see the decision log's responsibility boundary for why the other routes deliberately do not have it.

On mismatch the response is a **404 byte-identical to not-found, not a 403** — a recognisable 403 would confirm the id exists in another tenant and make foreign executions enumerable. The check is a no-op when either side is `null`, preserving single-tenant behaviour (which is also why untenanted rows stay app-layer visible — the threat-model trade-off).

→ `src/routes/executions.ts`

### Seam 5 — Postgres Row-Level Security (you enable this)

App-level scoping (`AuthPort` + seams 2–4) is the primary enforcement. RLS is the safety net for the day someone forgets a `WHERE tenant_id`. It is **not** shipped: under the no-op default a `NULL` session variable compared to a `NULL` column silently returns zero rows for every query, and the right policy (admin bypass? parent-tenant visibility? DB-per-tenant?) is consumer-specific.

```sql
-- consumer migration
ALTER TABLE executions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY executions_tenant_isolation ON executions
  USING (tenant_id = current_setting('app.current_tenant', true));
CREATE POLICY events_tenant_isolation ON execution_events
  USING (tenant_id = current_setting('app.current_tenant', true));
```

Each request opens a transaction and sets `app.current_tenant` before querying (a `withTenantScope(tenantId, run)` helper wrapping `database.transaction` + `SELECT set_config(...)`). This is **not yet shipped or tested** — treat it as a sketch until the recipe lands (decision-log follow-up); do not paste it into production untested.

Gotchas the code cannot teach you:

- **`current_setting('app.current_tenant', true)` returns `NULL` when unset, and `NULL = NULL` matches nothing** — a request that forgets to set the tenant sees zero rows, not all rows. This is the exact reason RLS cannot be on by default in the single-tenant reference.
- Migrations and superuser ops need a role with `BYPASSRLS`.
- If the SSE dispatcher should fan out per tenant without reloading the row, the `pg_notify` payload must also carry the tenant.

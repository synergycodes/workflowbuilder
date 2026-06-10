### Title: TenantContextPort — multi-tenant identity seam for the reference backend

### Proposed by: Kacper Cierzniewski

### Proposed: 21.05.2026 — Landed: 03.06.2026 (`fa5999dd`)

> This is the **decision** (why this shape, what was rejected, what it does and does not protect). The **how-to-wire-it** lives in [`multi-tenancy.md`](./multi-tenancy.md) — that document tracks the code and is the source of truth for current signatures and per-seam status. If a snippet here ever disagrees with the code, the code wins.

## Context

The reference backend (`apps/backend` + `apps/execution-worker`) ships **single-tenant**. Real multi-tenant consumers need a tenant identifier to flow from the incoming HTTP request, through workflow submission, into worker activities, and back into event emission and SSE streams.

Without an explicit seam, multi-tenancy degrades into a cross-cutting hack: a `getTenantFromRequest(req)` helper called in 17 routes, a `tenant_id` quietly threaded through every executor, a `WHERE tenant_id = ?` clause every consumer remembers to add or forgets. Forgetting it once is the canonical multi-tenancy bug — one tenant reading another's data.

## Decision

Introduce `TenantContextPort` (`apps/backend/src/tenant/`): an interface with a single method `resolve(request) → TenantContext | null`, plus a default `NoopTenantContextPort` that resolves to `null` on every request. A consumer makes the backend multi-tenant by swapping one line (the port instance), not by re-implementing the wiring.

The port is small on purpose; the **wiring around it (the five seams) is the actual contract**, documented in [`multi-tenancy.md`](./multi-tenancy.md). Two structural commitments are load-bearing and stated here because the code does not enforce them:

- **The port lives in `apps/backend`, not `packages/execution-core`.** `execution-core` stays tenant-agnostic. If a consumer's executors need the tenant at runtime, it rides the existing opaque `ExecutionContext.variables` bag; the reference never injects it.
- **`resolve()` takes the raw `Request`**, so a tenant adapter never depends on auth having run. The two seams compose without coupling.

## Responsibility boundary: TenantContextPort vs AuthPort

The backend has two identity seams and they own different things. **Getting this split wrong is how the cross-tenant bug sneaks back in**, so it is stated explicitly — the code cannot express it.

- **AuthPort owns per-resource authorization, including tenant ownership.** Every scoped route calls `assertAuthorized(c, action, resource)` before touching data. In a multi-tenant deployment "may act on this resource" _means_ "belongs to the caller's tenant". This is the single, systematic place resource scoping lives. Sprinkling `if (row.tenantId !== caller.tenantId)` into every route is the shotgun anti-pattern this design exists to avoid.
- **TenantContextPort owns identity propagation** — resolve the tenant once at the HTTP boundary, carry it onto the execution row and (denormalised) event rows, so reads, the worker, and RLS can all scope by it. **Propagation is not isolation.**

The SSE stream cross-check (seam 4) is the **one deliberate exception** — defence-in-depth, not the general guard. `GET /:id/stream` cannot use a bearer token (EventSource sends no `Authorization` header), so its auth falls back to weaker query-param/cookie schemes; the tenant resolved independently by `TenantContextPort` gives a second check on exactly that weak path. `GET /:id` and `DELETE /:id` carry no such cross-check on purpose — they rely on `AuthPort` plus RLS.

**Consequence a consumer must internalise:** implementing `TenantContextPort` alone does **not** isolate tenants. Isolation is `AuthPort` (app layer) plus RLS (DB layer). The seam map is the full job.

## Threat model

What this design defends against, and what it deliberately does not — so a reviewer can tell an accepted risk from an oversight.

- **Defended:** a tenant reading or streaming another tenant's executions/events through the API, once a real `AuthPort` is plugged in (app layer) and RLS is enabled (DB layer). Enumeration of foreign execution ids is closed by the 404-not-403 choice on the stream boundary (a recognisable 403 would confirm the id exists in another tenant; an indistinguishable 404 does not).
- **Out of scope (accepted, not overlooked):**
  - **Untenanted rows (`tenant_id IS NULL`) are globally visible at the app layer.** The null-tolerant cross-check required for the single-tenant reference means these rows are not isolated until RLS is on. Acceptable because the reference is single-tenant; a multi-tenant consumer must enable RLS and backfill.
  - **An insider or process with direct Postgres access.** RLS raises the bar but the app trusts its DB session; this is not a defence against a compromised database role.
  - **Side-channel / timing inference.** Response-time differences between tenanted paths are not equalised.

## Alternative options considered

- **Bake tenancy into `execution-core`.** Rejected. The runner ships to consumers who may not be multi-tenant; a `tenantId` on `BaseNode`/`ExecutionContext` would force every adapter to know about tenants. The variables-bag transport keeps execution-core ignorant and the field optional.
- **A single inline `getTenant(request)` helper.** Rejected. A helper called across 17 routes is exactly the cross-cutting hack to avoid. A port plus middleware adds one indirection but survives swap-in scenarios (subdomain → JWT, multi-region tenant store) without touching every route.
- **Thread `tenantId` through the workflow to the event INSERT** (instead of the seam-3 subquery). Rejected. Re-introduces a per-call-site parameter the worker must carry and could forget, coupling the otherwise tenant-agnostic worker to tenancy. The subquery costs one indexed lookup per event and ties the event's tenant to its parent at insert time.
- **Per-tenant Temporal namespace.** Stronger isolation than RLS but multiplies operational cost and couples the application to Temporal. Out of scope; the port composes with it if a consumer chooses it.
- **Header-based vs subdomain-based resolution.** Not our call. The port stays resolution-method-agnostic.

## Consequences

- **Pros**
  - Reference stays single-tenant with the no-op default; cloning and running it needs zero tenancy ceremony.
  - Swap-one-line multi-tenancy for seams 1–4 — wiring is shipped, not left as an exercise; the consumer replaces the port instance and enables seam 5.
  - A five-seam map tells consumers exactly where to wire and which seam owns what.
  - No `execution-core` change; the worker stays tenant-agnostic.
- **Cons**
  - **Identity propagation is not isolation** — the headline foot-gun if the responsibility boundary is skimmed.
  - **Untenanted rows are app-layer visible** until RLS is on (see threat model).
  - Event tenant-tagging depends on the `executions.tenant_id` subquery — one indexed lookup per event insert, traded for a worker that stays fully tenant-agnostic.

## Verification status

What is enforced by a test versus what is a contract only on paper. Honesty here matters more than completeness — an untested seam is a claim, not a guarantee.

| Seam                                         | Behaviour under test                                                                          | Status                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1 — middleware `resolve` / `requireTenant`   | resolves once onto context; noop yields `null`                                                | ✅ `tenant/middleware.test.ts`, `tenant/noop-tenant-context-port.test.ts`                                        |
| 2 — execute stamps tenant on the row         | `tenantId` written to the execution row, `null` in single-tenant mode, never into `variables` | ✅ `routes/workflows.test.ts`                                                                                    |
| 4 — SSE stream cross-check                   | 404-not-403 on mismatch (no existence leak); streams on match; no-op when either side `null`  | ✅ `routes/executions.test.ts`                                                                                   |
| 3 — worker inherits `tenant_id` via subquery | event row's `tenant_id` matches its parent execution                                          | ⚠️ **Not tested.** `execution-worker` has no test exercising `src/database.ts`. Paper contract — see follow-ups. |
| 5 — Postgres RLS                             | —                                                                                             | Not shipped; documented pattern in [`multi-tenancy.md`](./multi-tenancy.md).                                     |

## Revisit triggers

This decision stands until one of these fires:

- A real multi-tenant consumer proves the `variables`-bag transport for tenant-in-executor is too type-unsafe → reconsider a typed `tenantId` on `ExecutionContext` (reopens "bake into execution-core").
- The reference itself goes multi-tenant, making globally-visible untenanted rows unacceptable → ship RLS plus a `NOT NULL` backfill, flipping seam 5 from pattern to code.
- The per-event subquery shows up in profiling at scale → revisit threading tenant through the worker.
- A consumer needs stronger isolation than RLS → open a namespace-per-tenant decision log.

## Follow-ups

- **Add a worker-side test for seam 3** (the subquery inheritance) — close the paper-contract gap flagged above.
- **AuthPort integration recipe**: the JWT-claim pattern, including parsing the token once in a combined middleware shared by both ports.
- **Ship a tested RLS recipe** under `apps/backend/migrations/recipes/multi-tenant.sql` (policy + a `withTenantScope` transaction helper), gated behind an env flag during `pnpm db:migrate`. Until it exists and is tested, seam 5 stays a documented pattern, not shipped code.
- **Tenant in `node_failed` payloads**: stamp tenant on event payloads so a sink can pivot logs by tenant without joining back to `executions`.

## Status

Accepted. Port + `NoopTenantContextPort` default + seams 1–4 wired as no-ops in the reference backend (seam 3 untested — see Verification status); seam 5 (RLS) documented as a consumer-enabled pattern in [`multi-tenancy.md`](./multi-tenancy.md).

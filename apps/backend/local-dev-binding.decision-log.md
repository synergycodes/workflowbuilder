### Title: Default to 127.0.0.1 binding for the reference backend

### Proposed by: Kuba Skibiński

### Date: 27.04.2026

## Context

The reference execution backend (`apps/backend` + `apps/execution-worker`) ships alongside the public Workflow Builder SDK. It has **no authentication, no authorization, no user/tenant isolation, and no CORS restrictions** — every route in `apps/backend/src/routes/` is fully public. The HTTP server in `apps/backend/src/server.ts` was binding to `0.0.0.0` (the Hono `serve(...)` default), and `apps/backend/docker-compose.yml` exposed every container port (`5432`, `5433`, `7233`, `8233`) on all interfaces.

Postgres in the compose stack uses default credentials `wb:wb`. The combination "open API + open DB with default creds" is a credential leak waiting to happen the moment anyone runs `pnpm dev` on a machine with port-forwarding, a public IP, or a guest network — even unintentionally.

The bug-report (post-review item I-02) split the response into two efforts:

- **S** — OSS-readiness gate: README warnings + default `127.0.0.1` binding.
- **L** — structural fix: introduce `AuthPort`, Hono auth middleware, schema migration adding `users`/`tenants`/`ownerId`, route-level scoping.

This PR delivers the S effort; L is deferred as a separate larger work item.

## Decision

1. Add a `HOST` env var to `apps/backend/src/env.ts`, defaulting to `'127.0.0.1'`. Pass it as `hostname` to `serve(...)` in `apps/backend/src/server.ts`.
2. Prefix every port mapping in `apps/backend/docker-compose.yml` with `127.0.0.1:` so all four services (app-db, temporal-db, temporal, temporal-ui) bind to loopback only.
3. Add a prominent `⚠️ Reference Backend — Local Development Only` section to the top-level `README.md`, immediately before `## Community Edition`. Keep the existing reference-implementation framing, promote it into a hard security warning.
4. Add a top-of-file blockquote callout to `apps/backend/README.md` so anyone landing in the backend's docs while setting up the dev stack sees the warning before they boot.
5. Document the new `HOST` var in `apps/backend/.env.example` with an inline comment that names the lack of auth explicitly.

## Alternative Options Considered

- **Implement real authn/authz now.** Rejected. Scope L (multi-day, multi-PR). Real auth needs DB schema migration, login flow, frontend changes, decision on auth strategy (API key, JWT, OIDC) — none of which belong in a single fix-a-bug PR. The bug-report itself splits this into immediate (S) vs structural (L) on purpose.
- **Bind to `0.0.0.0`, only add a documentation warning.** Rejected. Docs are not a substitute for safe defaults. With Postgres exposing `wb:wb` by default, mere wording will not stop accidental exposure.
- **Hardcode `127.0.0.1` in the source with no env override.** Rejected. Removes the legitimate escape hatch — running the backend inside a container, where `0.0.0.0` is correct because the container's network namespace is itself isolated, would otherwise require source edits. Making it env-configurable preserves that path while keeping the default safe.

## Consequences

- **Pros**
  - **Secure-by-default.** A fresh `pnpm dev` exposes nothing to the LAN. The reference setup cannot be accidentally network-reachable.
  - **Explicit opt-in for wider exposure.** Anyone who genuinely needs to bind to `0.0.0.0` (e.g. containerised deploy) must set `HOST=0.0.0.0` AND edit `docker-compose.yml`. The friction is the point — that pause is the moment to add real auth.
  - **No functional change for default `localhost` traffic.** The frontend, the worker, and any local `curl` continue to work because all of them connect via `localhost` / `127.0.0.1`.

- **Cons**
  - **No real auth yet.** A user who does opt out of loopback is still operating an open server. The `HOST` override does not prevent foot-gunning, only signals it.
  - **`cors()` is still wide open.** It only matters if someone bypasses the binding. Restricting CORS depends on having a notion of "trusted origin", which depends on auth.
  - **Postgres credentials are still the default `wb:wb`.** Out of scope for this PR — credential rotation belongs with the auth work.

## Status

Accepted

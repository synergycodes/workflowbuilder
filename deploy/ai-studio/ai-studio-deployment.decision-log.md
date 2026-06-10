### Title: Containerized AI Studio deployment — portable compose stack

### Proposed by: Jan Librowski

### Date: 10.06.2026

## Context

WB-229 (lean public demo on an Azure VM) and its parent WB-155 (deployment
preparations) needed a production deployment story for the AI Studio
execution stack: backend (Hono), execution-worker (Temporal), two Postgres
instances, a Temporal server, and the static SPA. Until now only `pnpm dev`
plus an infra-only compose existed — no Dockerfiles for any app.

Constraints that shaped the design:

- **Portability over Azure ergonomics.** Workflow Builder is sold to external
  customers; whatever ships here must run on AWS / GCP / on-prem / bare
  Docker without re-architecting. DevOps asked for containerization
  specifically for ease of portability and setup.
- **Surprise bills must be impossible** (WB-229): a hard OpenRouter spend cap
  (dashboard Guardrail) plus an in-app per-IP abuse gate.
- **The local dev flow must survive** (`pnpm dev:ai-studio` + `pnpm
infra:up`) — contributors rely on it; nothing in dev changes.
- The repo pins Node 22.12.0 + pnpm 10.17.0 with `engineStrict`, and the
  Temporal worker bundles its workflow entrypoint **from TS source at
  runtime**, so the source tree must be present in the worker container.

## Decision

Everything lives in `deploy/ai-studio/`: one multi-target Dockerfile, a
production `docker-compose.yml`, the nginx config, `.env.example`, and a
DevOps-facing README.

1. **One Dockerfile, three targets** (`runtime`, `migrate`, `web`), built
   with the repo root as context (pnpm `workspace:*` links require it). A
   shared `source` stage does `pnpm fetch` against a BuildKit cache mount, so
   per-target installs are store-hits.
2. **tsx in production, no build step.** Backend and worker run TS through
   `tsx` exactly as in dev — `tsx` moved from a hoisted root devDependency to
   a real dependency of both apps, plus `start:prod` scripts (the existing
   `start` scripts hard-require a `.env` file; containers inject env
   directly). This sidesteps the Temporal-sandbox-needs-source constraint
   entirely — there is no bundling step to get wrong.
3. **One shared `runtime` image for backend and worker**; the compose
   `command` picks the entrypoint. One image to build, push, and version.
4. **Migrations as a one-shot compose service** (`migrate` target, carries
   drizzle-kit as a backend devDependency). `depends_on:
service_completed_successfully` gates the backend, so `docker compose up`
   is a complete first boot. Same answer works as a k8s Job / ACA job if a
   customer reshapes the topology.
5. **nginx is the only public surface.** It serves the SPA and proxies
   `/api` to the backend on the internal network; the SSE stream route gets
   `proxy_buffering off` + long read timeout. The backend container is
   reached through Docker's embedded DNS **re-resolved per request**
   (`resolver 127.0.0.11` + variable `proxy_pass`) — a statically resolved
   upstream 502s after the backend container is recreated on redeploy.
   Postgres ×2, Temporal, and the backend publish no host ports; Temporal UI
   is opt-in behind a `debug` profile bound to loopback. TLS terminates in
   front (existing ingress or host-level Caddy/certbot — documented in the
   README, deliberately not baked into the stack).
6. **Same-origin frontend.** `VITE_BACKEND_URL` is baked empty at build time;
   the SPA calls `/api` on its own origin. No CORS, no second hostname, SSE
   intact.
7. **pnpm installed via `npm i -g pnpm@10.17.0` in images, not corepack.**
   The corepack bundled with Node 22.12.0 cannot load pnpm 10
   (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`) and ships stale signature
   keys. Version is duplicated in the Dockerfile — keep in sync with
   `packageManager`.
8. **Installs use `--prefer-offline`, not `--offline`**: pnpm propagates
   offline mode to lifecycle scripts, and `apps/icons` `prepare` shells out
   to `npx @svgr/cli`, which then refuses the network (`ENOTCACHED`).
9. **Per-IP rate limit on the execute route** (`apps/backend`):
   fixed-window, in-memory, env-gated (`RATE_LIMIT_EXECUTE_PER_MINUTE/DAY`,
   default off so dev is untouched; compose sets 10/min, 50/day).
   `TRUST_PROXY=true` makes it read the client from `X-Forwarded-For`, which
   only our nginx can set. This is the abuse gate; the money cap is the
   OpenRouter account Guardrail — two independent controls.
10. **Model pinned per environment, not in code**: compose defaults
    `AI_MODEL=mistralai/mistral-small-3.2-24b-instruct` (price re-verified
    2026-06-10 against the OpenRouter API: $0.075/$0.20 per Mtok ≈ $0.0004
    per 3-call template run). Swapping models is an env change.
11. **Pinned images, no `:latest`**: `temporalio/auto-setup:1.29.6.1`,
    `temporalio/ui:2.51.0`, `nginx:1.31-alpine`, `node:22.12.0-bookworm-slim`
    (exact pin because `engineStrict` rejects any other 22.x).

Found and fixed during end-to-end verification: the worker ignored
`TEMPORAL_ADDRESS` (`Worker.create` without an explicit connection dials
`127.0.0.1:7233` — invisible in local dev, fatal in containers).

## Alternative Options Considered

- **`pnpm deploy` to materialize standalone app bundles** — rejected: pnpm 10
  requires `inject-workspace-packages` or a legacy-mode flag, adding workspace
  config churn for no benefit over running from the installed workspace.
- **Compile step (tsc/tsup/esbuild) + plain `node`** — rejected for the MVP:
  the worker needs its TS source on disk for Temporal's runtime bundling
  anyway, so compilation only helps the backend while doubling the ways the
  artifact can diverge from dev. Revisit if image size or cold-start matters.
- **Azure-specific artifacts (Container Apps / AKS manifests, Key Vault
  wiring)** — deferred deliberately: WB-229 targets a single VM, and the
  portability requirement says external customers must not inherit Azure
  glue. The compose file is the customer-facing artifact; platform topology
  can wrap it later.
- **Separate Dockerfiles per app** — rejected: three near-identical
  install stages to keep in sync; the multi-target file shares layers.
- **Rate limiting in nginx (`limit_req`)** — rejected: the limit is
  per-execute-route and needs structured JSON 429s consistent with the
  backend's error contract; nginx zones would split the policy across two
  layers. nginx stays dumb, policy lives where the route lives.
- **Redis-backed rate limiter** — deferred to the scale-ready task (WB-229
  explicitly accepts single-replica in-memory for the MVP).

## Consequences

- **Pros**
  - `cp .env.example .env && docker compose up -d --build` is the whole
    deployment; verified end-to-end (Sales Inquiry Pipeline to
    `execution_completed` with live SSE through nginx, rate limiter returning
    429s past the budget).
  - The artifact is platform-neutral: any Docker host, no cloud SDK anywhere.
  - Secrets only travel through compose `environment`; `.dockerignore` now
    excludes `**/.env*` so keys cannot be baked into images (previously
    `apps/*/.env` files would have been copied into the build context).
  - Dev flow untouched; rate limiter is inert without its env vars.
- **Cons**
  - `runtime` image is ~1.9 GB (full source tree + pnpm store hardlinks +
    Temporal native bridge). Acceptable for a demo VM; a compile step or
    `pnpm deploy` bundle is the known optimization path.
  - Any source change invalidates the `COPY . .` layer and reinstalls
    (mitigated by the store cache mount; rebuilds are minutes, not tens of).
  - `temporalio/auto-setup` is dev-grade by Temporal's own docs — accepted
    for the demo, swap for Temporal Cloud / operated cluster under sustained
    load (the apps only consume `TEMPORAL_ADDRESS`).
  - pnpm version is pinned in two places (root `packageManager` +
    Dockerfile).

## Status

Accepted

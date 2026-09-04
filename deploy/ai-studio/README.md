# Deploying AI Studio

Self-contained, portable deployment of the AI Studio stack (WB-229). Runs on
any Docker host — an Azure VM, AWS, on-prem — with no cloud-specific glue.

## What runs

| Service       | Image                          | Role                                          | Exposed                  |
| ------------- | ------------------------------ | --------------------------------------------- | ------------------------ |
| `web`         | `ai-studio-web` (nginx)        | Serves the SPA, proxies `/api` to the backend | `${WEB_PORT}` (only one) |
| `backend`     | `ai-studio-runtime`            | Hono REST + SSE event stream                  | internal                 |
| `worker`      | `ai-studio-runtime`            | Temporal worker, makes the LLM calls          | internal                 |
| `temporal`    | `temporalio/auto-setup` pinned | Workflow engine                               | internal                 |
| `app-db`      | `postgres:16`                  | Workflow snapshots + execution events         | internal                 |
| `temporal-db` | `postgres:16`                  | Temporal's own state store                    | internal                 |
| `temporal-ui` | `temporalio/ui` pinned         | Debug only (`--profile debug`)                | `127.0.0.1:8233`         |

The three Temporal rows come from
[`docker-compose.override.yml`](docker-compose.override.yml), which compose
applies on top of [`docker-compose.yml`](docker-compose.yml) by default. The base
file alone has no cluster: the apps connect to whatever `TEMPORAL_ADDRESS` names
and depend only on `app-db` — see "Pointing at a different Temporal".

Both images build from one Dockerfile (`deploy/ai-studio/Dockerfile`) with the
repo root as context. Backend and worker share a single image and differ only
in the compose `command`. Database migrations are applied by the backend at
boot (drizzle-orm's programmatic migrator) — there is no separate migration
service or step.

## Quick start

```bash
cd deploy/ai-studio
cp .env.example .env        # set AI_API_KEY to enable AI Agent nodes
docker compose up -d --build
```

First boot: the backend applies migrations and only then starts serving (its
healthcheck gates the worker). The worker crash-loops for ~30s until Temporal
finishes auto-setup — that's expected, `restart: unless-stopped` converges it.

Verify:

```bash
curl -s http://localhost:8080/api/health   # {"status":"ok"}
# open http://localhost:8080, run the "Sales Inquiry Pipeline" template
```

## Spend safety (do not skip)

Two independent controls; both must be in place before the URL goes public:

1. **OpenRouter Guardrail** (hard $/day ceiling, no code involved):
   [openrouter.ai](https://openrouter.ai) → Settings → Guardrails → daily
   spend limit, e.g. **$5/day** (resets 00:00 UTC). When hit, OpenRouter
   rejects calls and the demo pauses — it cannot overspend. Keep the account
   balance low (~$20) as the absolute ceiling.
2. **Per-IP rate limit** (already on in this compose): defaults to 10
   executions/min and 50/day per IP, tunable via
   `RATE_LIMIT_EXECUTE_PER_MINUTE` / `RATE_LIMIT_EXECUTE_PER_DAY`. In-memory,
   single-replica by design; counters reset on backend restart.

At the defaults, a worst case full Guardrail day costs $5; a typical
3-LLM-call template run on Mistral Small 3.2 costs ~$0.0004.

## TLS / going public

The `web` container speaks plain HTTP on the internal port. Pick one:

- **Existing ingress** (Azure Application Gateway / Front Door, an nginx that
  already routes your other web apps, …): point it at `WEB_PORT`, set
  `WEB_BIND=127.0.0.1` if the ingress runs on the same host. SSE caveat: the
  ingress must not buffer `/api/executions/*/stream` responses and needs a
  read timeout above 60s (the stream heartbeats every 15s).
- **Standalone VM**: run a host-level [Caddy](https://caddyserver.com)
  (`reverse_proxy localhost:8080` — automatic Let's Encrypt, SSE-safe out of
  the box) or certbot'd nginx in front, and firewall everything except
  80/443.

Keep 8233 (Temporal UI) and the Postgres ports unreachable from outside —
this compose never publishes them; don't undo that.

## Configuration

See [.env.example](.env.example) — every variable is documented there.
Swapping the model is a one-liner: change `AI_MODEL` to any id the endpoint
understands (for OpenRouter, an [OpenRouter model id](https://openrouter.ai/models))
and `docker compose up -d worker`.

**Pointing at a different LLM.** `AI_BASE_URL` takes any OpenAI-compatible
endpoint, so a gateway or a model hosted inside your own network works without
a code change — set it alongside `AI_API_KEY` and `AI_MODEL`. None of the three
has a built-in default; `.env.example` pre-fills the OpenRouter values the stack
used before the endpoint became configurable. Leave any of them empty and the
stack still comes up: every node type runs except AI Agent nodes, which fail
with `ai_not_configured`.

**Upgrading from `OPENROUTER_API_KEY`.** The key is now `AI_API_KEY`, and the
endpoint and model are no longer built in. In `.env`, rename the key and add
`AI_BASE_URL` and `AI_MODEL` (the OpenRouter values are in `.env.example`).
Compose refuses to start while the old name is still set, so a stale `.env`
fails loudly instead of coming up with AI silently off.

**Pointing at a different Temporal.** Every `TEMPORAL_*` variable reaches the
backend and the worker from one shared block in the compose file, so the two
cannot disagree. `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TLS` and
`TEMPORAL_API_KEY` are all an operated cluster or Temporal Cloud needs. Add
`COMPOSE_FILE=docker-compose.yml` to `.env` at the same time: it leaves the
override file out, so the bundled cluster is not started and cannot block the
apps, and `backend` / `worker` depend only on `app-db`. Run
`docker compose down --remove-orphans` once when switching. A contradictory
`TEMPORAL_*` combination stops the worker at boot (`docker compose logs worker`);
the backend connects on first use, so it still passes its healthcheck and fails
on the first Play — check the worker, not `/api/health`. The bundled debug
UI (`--profile debug`) is part of the override and only ever shows the bundled
cluster — an external cluster has its own UI. For a private CA or mTLS, drop the PEM files into [`tls/`](tls/) (git-ignored, mounted
read-only into both containers at `/etc/workflowbuilder/tls`) and set
`TEMPORAL_TLS_CA_PATH` / `_CERT_PATH` / `_KEY_PATH` to those container paths —
see [.env.example](.env.example) for the exact lines.

## Operations

```bash
docker compose logs -f backend worker        # tail the apps
docker compose --profile debug up -d         # Temporal UI on 127.0.0.1:8233
docker compose up -d --build                 # deploy a new version (backend re-applies migrations at boot)
docker compose down                          # stop (volumes survive)
docker exec ai-studio-app-db-1 pg_dump -U wb workflow_builder > backup.sql
```

The public demo is deployed by the `Deploy AI Studio` GitHub Actions workflow:
it builds and pushes both images to the registry, copies `docker-compose.yml`
and `docker-compose.override.yml` from the repo to the VM, and runs compose
there with `RUNTIME_IMAGE` / `WEB_IMAGE` pointing at the tags it just pushed.
The VM's compose files are that copy — change them in the repo, never on the
VM. Only `.env` lives on the VM alone.

Workflow data is treated as ephemeral for the public demo — losing the
volumes is acceptable; there is nothing precious in them.

**Before deploying a worker image that changes which execution events are
emitted**, let in-flight executions finish. Temporal replays a running
workflow's history against the deployed code, so a run started on the old
emit sequence diverges when replayed on the new one. Check for active runs in
the Temporal UI (`--profile debug` for the bundled cluster, your cluster's own UI
otherwise), or accept that any still running will fail. Deploys that leave the emit sequence alone are unaffected. See
[`replay-audit.md`](../../packages/execution-core/replay-audit.md) rule 9.

## Known limitations (accepted for the lean MVP)

- **No login.** The API is open (`WB_AUTH_PORT=allow-all`); anyone with the
  URL can create and run workflows within the rate limits. The SDK has an
  `AuthPort` seam for wiring real auth later.
- **Single backend replica.** The rate limiter is process-local. Scaling out
  needs a shared store (Redis) — deferred to the scale-ready task.
- **`temporalio/auto-setup` is dev-grade.** Fine for a demo; move to Temporal
  Cloud or an operated cluster for sustained load. That move is configuration
  only — see "Pointing at a different Temporal" above.
- **Anyone-can-edit demo content.** Visitors share one workspace; data is
  wiped whenever you decide to recreate the volumes.

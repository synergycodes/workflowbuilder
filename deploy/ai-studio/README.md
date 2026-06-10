# Deploying AI Studio

Self-contained, portable deployment of the AI Studio stack (WB-229). Runs on
any Docker host — an Azure VM, AWS, on-prem — with no cloud-specific glue.

> Deploying onto the company Swarm cluster instead? See
> [`tools/deployment/`](../../tools/deployment/README.md) — same images,
> Traefik/ACR/Ansible orchestration aligned with the workflow-builder repo.

## What runs

| Service       | Image                          | Role                                            | Exposed                  |
| ------------- | ------------------------------ | ----------------------------------------------- | ------------------------ |
| `web`         | `ai-studio-web` (nginx)        | Serves the SPA, proxies `/api` to the backend   | `${WEB_PORT}` (only one) |
| `backend`     | `ai-studio-runtime`            | Hono REST + SSE event stream                    | internal                 |
| `worker`      | `ai-studio-runtime`            | Temporal worker, makes the OpenRouter LLM calls | internal                 |
| `migrate`     | `ai-studio-migrate`            | One-shot Drizzle migrations, then exits         | internal                 |
| `temporal`    | `temporalio/auto-setup` pinned | Workflow engine                                 | internal                 |
| `app-db`      | `postgres:16`                  | Workflow snapshots + execution events           | internal                 |
| `temporal-db` | `postgres:16`                  | Temporal's own state store                      | internal                 |
| `temporal-ui` | `temporalio/ui` pinned         | Debug only (`--profile debug`)                  | `127.0.0.1:8233`         |

All images build from one Dockerfile (`deploy/ai-studio/Dockerfile`) with the
repo root as context. Backend and worker share a single image and differ only
in the compose `command`.

## Quick start

```bash
cd deploy/ai-studio
cp .env.example .env        # set OPENROUTER_API_KEY
docker compose up -d --build
```

First boot: migrations run automatically (`migrate` exits 0, then the backend
starts). The worker crash-loops for ~30s until Temporal finishes auto-setup —
that's expected, `restart: unless-stopped` converges it.

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
Swapping the LLM is a one-liner: change `AI_MODEL` to any
[OpenRouter model id](https://openrouter.ai/models) and
`docker compose up -d worker`.

## Operations

```bash
docker compose logs -f backend worker        # tail the apps
docker compose --profile debug up -d         # Temporal UI on 127.0.0.1:8233
docker compose up -d --build                 # deploy a new version (re-runs migrations)
docker compose down                          # stop (volumes survive)
docker exec ai-studio-app-db-1 pg_dump -U wb workflow_builder > backup.sql
```

Workflow data is treated as ephemeral for the public demo — losing the
volumes is acceptable; there is nothing precious in them.

## Known limitations (accepted for the lean MVP)

- **No login.** The API is open (`WB_AUTH_PORT=allow-all`); anyone with the
  URL can create and run workflows within the rate limits. The SDK has an
  `AuthPort` seam for wiring real auth later.
- **Single backend replica.** The rate limiter is process-local. Scaling out
  needs a shared store (Redis) — deferred to the scale-ready task.
- **`temporalio/auto-setup` is dev-grade.** Fine for a demo; move to Temporal
  Cloud or an operated cluster for sustained load.
- **Anyone-can-edit demo content.** Visitors share one workspace; data is
  wiped whenever you decide to recreate the volumes.

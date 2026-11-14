# Executable demo Docker stack

A self-contained local deployment of the Workflow Builder executable demo. One
Compose command starts the browser editor, reference backend, dedicated demo
execution worker, Temporal, Temporal UI, and both PostgreSQL databases. It does
not start AI Studio, and it leaves the canonical UI-only `apps/demo` unchanged.

## Execution guarantees

The executable sibling owns eight runtime node types:

| Node         | Backend behavior                                                                          |
| ------------ | ----------------------------------------------------------------------------------------- |
| Trigger      | Manual Run only; emits the supplied JSON object as its payload                            |
| Action       | Safe simulation; no HTTP, email, CRM, script, subprocess, or filesystem I/O               |
| Delay        | Fixed seconds/minutes/hours via a durable Temporal timer (maximum 24 hours)               |
| Conditional  | Selects exactly the `true` or `false` output port                                         |
| Decision     | Takes the first matching branch, otherwise the visible `default` port                     |
| Notification | Safe simulation; no email/SMS/push/webhook/Slack request is sent                          |
| AI Agent     | Calls the server-selected OpenRouter model when configured; otherwise fails only the node |
| Multi-port   | Waits for all connected live inputs, then fans out both connected outputs                 |

Action and Notification output explicitly reports that it was simulated. The
worker never interprets browser-stored URLs, headers, scripts, provider
credentials, or AI tool keys.

`OPENROUTER_API_KEY` is optional. With it empty, the complete stack boots and all
non-AI workflows execute. Reaching an AI Agent emits a structured
`ai_provider_not_configured` node failure and never returns a fake response.

## What runs

| Service       | Role                                             | Host endpoint           |
| ------------- | ------------------------------------------------ | ----------------------- |
| `web`         | Serves `apps/executable-demo` and proxies `/api` | http://127.0.0.1:4200   |
| `backend`     | Hono workflow REST API and SSE stream            | Via web `/api` only     |
| `worker`      | Polls `demo-workflow-execution`                  | Internal only           |
| `temporal`    | Workflow engine                                  | `127.0.0.1:7233` (gRPC) |
| `temporal-ui` | Temporal inspection UI                           | http://127.0.0.1:8233   |
| `app-db`      | Workflow snapshots and execution events          | Internal only           |
| `temporal-db` | Temporal state                                   | Internal only           |

The databases become healthy first. Temporal passes its cluster-health probe,
the backend applies pending Drizzle migrations, the demo worker begins polling,
and nginx exposes the healthy same-origin API.

## Quick start

Run from a checkout on a Docker-capable host:

```bash
cd deploy/demo
cp .env.example .env       # OPENROUTER_API_KEY may remain empty

docker compose config --quiet
docker compose build --pull
docker compose up -d --wait --wait-timeout 180
docker compose ps --all
```

Open http://127.0.0.1:4200. Choose an executable template, click Run, and provide
an optional JSON object as the manual trigger payload.

## Verify

A Docker-capable checkout can run the automated stack smoke with isolated ports
and volumes:

```bash
cd ../..
OPENROUTER_API_KEY= pnpm test:e2e:demo-stack
```

The smoke builds the real images, waits for health, verifies the demo worker
queue, and always tears its isolated Compose project down. Browser-level node
execution acceptance remains the checklist below.

```bash
curl -fsS http://127.0.0.1:4200/ >/dev/null
curl -fsS http://127.0.0.1:4200/api/health
curl -fsS http://127.0.0.1:8233/ >/dev/null

docker compose logs --no-color worker | \
  grep -F 'demo-workflow-execution'

docker compose exec web \
  test -s /usr/share/nginx/html/index.html
```

Browser acceptance:

1. Run the all-node keyless template and observe node markers/log output.
2. Confirm Action and Notification report simulations.
3. Confirm Conditional/Decision skip the non-selected branches.
4. Start a delayed flow, cancel it, and observe terminal `cancelled` state.
5. Run the AI template with no key and confirm only the AI node reports
   `ai_provider_not_configured` while the worker stays healthy.

## Configuration

Copy [`.env.example`](.env.example) to `.env`. It documents:

- optional OpenRouter key and server model;
- backend execution rate limits;
- loopback bind addresses and host ports;
- application and Temporal database passwords.

Every published port defaults to IPv4 loopback. Backend and both databases stay
on the private Compose network. Keep passwords URL-safe because the application
password is interpolated into a PostgreSQL URI.

## Operations

```bash
# Follow application/runtime logs.
docker compose logs -f backend worker temporal

# Rebuild after pulling changes; backend applies migrations on boot.
docker compose up -d --build --wait --wait-timeout 180

# Stop containers while retaining named volumes.
docker compose down

# Start again.
docker compose up -d --wait --wait-timeout 180
```

Delete workflow and Temporal state only when the data loss is intentional:

```bash
docker compose down --volumes
```

Before deploying workflow-code changes, drain in-flight executions or accept
that Temporal replay may fail. Durable workflow history must replay against a
compatible command sequence.

## Security and exposure

This is a reference development stack, not a production-ready multi-tenant
service:

- The backend uses `WB_AUTH_PORT=allow-all`; it has no login, authorization, or
  tenant isolation.
- Temporal auto-setup is development-grade, and Temporal UI has no
  authentication.
- Keep the backend internal; do not add a host port or widen Temporal bindings.
- Expose only nginx through a TLS-capable ingress. Preserve unbuffered SSE and a
  read timeout above 60 seconds for `/api/executions/*/stream`.
- Set a hard OpenRouter daily Guardrail before enabling AI for other users.
- Change both database passwords for non-ephemeral environments.
- Simulation nodes do not make side effects; replacing them with real connectors
  requires authentication, secret storage, idempotency, egress controls, and
  audit/redaction design.

The nginx container runs as a non-root user and serves plain HTTP; TLS must
terminate at an external ingress such as Caddy, nginx, or a cloud load balancer.

# Deploying AI Studio

Self-contained, portable deployment of the AI Studio stack (WB-229). Runs on
any Docker host — an Azure VM, AWS, on-prem — with no cloud-specific glue.

## What runs

| Service       | Image                          | Role                                                                   | Exposed                  |
| ------------- | ------------------------------ | ---------------------------------------------------------------------- | ------------------------ |
| `web`         | `ai-studio-web` (nginx)        | Serves the SPA, proxies `/api` to the backend                          | `${WEB_PORT}` (only one) |
| `backend`     | `ai-studio-runtime`            | Hono REST + SSE event stream; calls the LLM for `/api/visualize/adapt` | internal                 |
| `worker`      | `ai-studio-runtime`            | Temporal worker, runs the nodes; AI Agent nodes call the LLM           | internal                 |
| `temporal`    | `temporalio/auto-setup` pinned | Workflow engine                                                        | internal                 |
| `app-db`      | `postgres:16`                  | Workflow snapshots + execution events                                  | internal                 |
| `temporal-db` | `postgres:16`                  | Temporal's own state store                                             | internal                 |
| `temporal-ui` | `temporalio/ui` pinned         | Debug only (`--profile debug`)                                         | `127.0.0.1:8233`         |

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

## Security headers

nginx answers the SPA with the headers an automated scan (Mozilla Observatory
or similar) grades on; the backend sets its own on `/api`. The policy lives in
[`nginx/security-headers.conf`](nginx/security-headers.conf) and is included in
each SPA location, because an nginx location with any `add_header` of its own
drops every header inherited from the server block.

The Content Security Policy:

```
default-src 'self'; script-src 'self' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;
connect-src 'self'; frame-src https://challenges.cloudflare.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Why each allowance is there, and what to change when your deployment differs:

- **No `'unsafe-eval'`.** Nothing in the SDK's runtime dependencies evaluates
  code; schema validation runs an interpreter, not compiled functions.
- **`style-src 'unsafe-inline'`.** The Ace editor and the toast library inject
  `<style>` elements without a nonce. Scripts stay nonce-free and `'self'`-only,
  which is what the scan grades on.
- **`font-src data:`.** The UI package bundles Poppins; the two most-used
  weights are inlined into its stylesheet. No font host is contacted.
- **`img-src data:`.** Vite inlines small images into the bundle, and the
  canvas library draws some of its backgrounds from inline SVG. An image a
  model embeds in Markdown output (`![](https://…)`) is blocked on purpose:
  untrusted output loads nothing from third parties.
- **`https://challenges.cloudflare.com`** in `script-src` and `frame-src` is
  Turnstile, which loads a script and renders an iframe. The origin is allowed
  even when bot protection is off; remove both if you never enable it.
- **`connect-src 'self'`** holds because the SPA reaches `/api` on its own
  origin. If you set `VITE_BACKEND_URL` to another host, add that origin here
  and list the web origin in `ALLOWED_ORIGINS`, or every request is blocked.
- **Enterprise smart routing** (libavoid, WebAssembly) needs
  `'wasm-unsafe-eval'` added to `script-src`. The Community SDK runs no
  WebAssembly and no web workers.

`Strict-Transport-Security` is sent on the assumption that TLS terminates at
your ingress in front of `web` (see "TLS / going public"): browsers only honour
it once they reach the origin over HTTPS, and ignore it on plain HTTP. The
remaining headers are `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
and `Referrer-Policy: strict-origin-when-cross-origin`.

Check a running stack with `curl -sI http://localhost:8080/ | grep -i -E
'content-security|strict-transport|x-frame|x-content|referrer'`, and watch the
browser console for "violates the following Content Security Policy" while
using the editor; a feature that stops working under a tightened policy fails
that way, with a generic network error in the UI.

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

<a id="before-deploying-this-version"></a>

**Before deploying this version.** The key is now `AI_API_KEY`, and the endpoint
and model are no longer built in, so a `.env` written for an earlier version
needs three lines before this one is deployed:

```bash
AI_API_KEY=<the value that was OPENROUTER_API_KEY>
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=mistralai/mistral-small-3.2-24b-instruct
```

A `.env` that sets `VITE_BACKEND_URL`, because the frontend is served from
another host than the API, also needs `ALLOWED_ORIGINS=<that web origin>`: the
backend now refuses cross-origin calls it is not told about, where it used to
answer every origin. A `.env` with `VITE_BACKEND_URL` empty needs nothing.

Renaming only the key is not enough: the stack comes up with every AI Agent
node failing `ai_not_configured`, because the endpoint and the model have no
built-in defaults any more. The deploy workflow refuses to run while
`OPENROUTER_API_KEY` is still set, before it writes anything to the VM, so a
stale `.env` stops the deploy instead of coming up with AI silently off. An
operator deploying by hand can run the same check:

```bash
grep -E '^OPENROUTER_API_KEY=.+' .env    # a hit means .env still needs the rename
```

**Pointing at a different Temporal.** Every `TEMPORAL_*` variable reaches the
backend and the worker from one shared block in the compose file, so the two
cannot disagree. `TEMPORAL_ADDRESS`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TLS` and
`TEMPORAL_API_KEY` are all an operated cluster or Temporal Cloud needs. Add
`COMPOSE_FILE=docker-compose.yml` to `.env` at the same time: it leaves the
override file out, so the bundled cluster is not started and cannot block the
apps, and `backend` / `worker` depend only on `app-db`. Run
`docker compose down --remove-orphans` once when switching. A contradictory
`TEMPORAL_*` combination stops both apps at boot with an explanatory error
(`docker compose logs backend worker`). The bundled debug
UI (`--profile debug`) is part of the override and only ever shows the bundled
cluster — an external cluster has its own UI. For a private CA or mTLS, drop the PEM files into [`tls/`](tls/) (git-ignored, mounted
read-only into both containers at `/etc/workflowbuilder/tls`) and set
`TEMPORAL_TLS_CA_PATH` / `_CERT_PATH` / `_KEY_PATH` to those container paths —
see [.env.example](.env.example) for the exact lines. `TEMPORAL_TLS_DIR` may
point at `./tls` or at a directory outside the checkout, nothing else: the
whole repository is the image build context, so a key placed in any other
in-repo directory is copied into the runtime image by a local build.

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
and `docker-compose.override.yml` from the repo to the VM, writes the tags it
just pushed into the VM's `.env` as `RUNTIME_IMAGE` / `WEB_IMAGE`, and runs
compose there. A first deploy of this version onto a VM whose `.env` still
carries `OPENROUTER_API_KEY` stops before writing anything — see [Before
deploying this version](#before-deploying-this-version).
Because the tags live in `.env`, every later compose command on
the VM (`docker compose up -d worker` after a model change, `--profile debug`)
resolves the deployed images, not the local `ai-studio-*` build names. The VM's
compose files are that copy — change them in the repo, never on the VM. Only
`.env` lives on the VM alone; the deploy replaces just its two image lines.

Workflow data is treated as ephemeral for the public demo — losing the
volumes is acceptable; there is nothing precious in them.

**Before deploying a worker image that changes which execution events are
emitted**, let in-flight executions finish. Temporal replays a running
workflow's history against the deployed code, so a run started on the old
emit sequence diverges when replayed on the new one. Check for active runs in
the Temporal UI (`--profile debug` for the bundled cluster, your cluster's own UI
otherwise), or accept that any still running will fail. Deploys that leave the emit sequence alone are unaffected. See
[`replay-audit.md`](../../packages/execution-core/replay-audit.md) rule 9.

**A release that widens what the worker accepts from the backend** (a new key on a
decision, as `outcome` was) wants the reverse: workers before the backend. This stack
cannot express it, since the backend is the migrator and the worker waits for it to be
healthy, so `docker compose up -d --build` recreates the backend first. Until the worker
is recreated, seconds later, a rejection answers 500. Accepted for the reference
deployment; the worker README ("Temporal specifics") has the reasoning.

## Known limitations (accepted for the lean MVP)

- **No login.** The API is open (`WB_AUTH_PORT=allow-all`); anyone with the
  URL can create and run workflows within the rate limits. The SDK has an
  `AuthPort` seam for wiring real auth later. A workflow or a run is reachable
  by whoever holds its id, which is random and never listed (`ENABLE_WB_LISTING`
  stays unset, so the collection routes answer 403). A run's link therefore
  grants full control of that run: reading it, stopping it, deciding for it.
- **Single backend replica.** The rate limiter is process-local. Scaling out
  needs a shared store (Redis) — deferred to the scale-ready task.
- **`temporalio/auto-setup` is dev-grade.** Fine for a demo; move to Temporal
  Cloud or an operated cluster for sustained load. That move is configuration
  only — see "Pointing at a different Temporal" above.
- **Anyone-can-edit demo content.** Visitors share one workspace; data is
  wiped whenever you decide to recreate the volumes.
- **Drafts are stored unvalidated.** `POST /api/workflows` and
  `PATCH /api/workflows/:id/draft` keep any JSON, so anyone can save a draft
  the editor cannot draw. Opening it from a `?workflowId=` link ends on an
  error screen with a way back to the local draft; a subtler value that draws
  wrongly shows wrongly. Either has to be removed by hand: from `workflows`,
  or for a run from `executions`.

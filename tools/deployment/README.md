# Swarm deployment (workflow-builder-aligned)

Deploys AI Studio onto the company Docker Swarm cluster on Azure, following
the same layout, scripts, and Ansible flow as the `workflow-builder` repo's
`tools/deployment/` — so DevOps operates one familiar shape.

This is an **orchestration overlay, not a second deployment**: it consumes
the exact same three images (`runtime`, `migrate`, `web`) built from
[`deploy/ai-studio/Dockerfile`](../../deploy/ai-studio/Dockerfile). The
compose file in `deploy/ai-studio/` remains the portable, customer-facing
artifact and the local full-stack runner; this directory adds the
ACR + Traefik + Ansible path for our own infrastructure.

```
tools/deployment/
├── scripts/
│   ├── build-docker.sh    # build all 3 targets, tag for ACR, push (CI-gated)
│   └── deploy.sh          # run the Ansible playbook (CI image or workstation)
└── ansible/deploy-application/
    └── main.yml           # writes the Swarm stack file on the master + deploys + migrates
```

## Usage

```bash
# build + push images (from repo root)
DEPLOY_ENV=dev ./tools/deployment/scripts/build-docker.sh

# deploy the stack (needs az login + ansible inventory with the `master` host)
DEPLOY_ENV=dev DEPLOYMENT_URL=ai-studio.example.com OPENROUTER_API_KEY=sk-... \
  ./tools/deployment/scripts/deploy.sh
```

Bitbucket-style variables (`BITBUCKET_COMMIT`, `BITBUCKET_DEPLOYMENT_ENVIRONMENT`,
`TAG_PREFIX`) take precedence when present, so the scripts drop into the
existing CI pattern unchanged; the fallbacks (`git rev-parse`, `DEPLOY_ENV`)
make them runnable from a workstation or GitHub Actions.

## Configuration

| Variable                                                                                 | Required  | Default                                    | Purpose                                                 |
| ---------------------------------------------------------------------------------------- | --------- | ------------------------------------------ | ------------------------------------------------------- |
| `DEPLOYMENT_URL`                                                                         | yes       | —                                          | Public hostname, drives Traefik routing + TLS           |
| `OPENROUTER_API_KEY`                                                                     | yes       | —                                          | Worker-side LLM key (pair with an OpenRouter Guardrail) |
| `DEPLOY_ENV` / `BITBUCKET_DEPLOYMENT_ENVIRONMENT`                                        | no        | `dev`                                      | Stack/environment suffix                                |
| `AI_MODEL`                                                                               | no        | `mistralai/mistral-small-3.2-24b-instruct` | OpenRouter model id                                     |
| `RATE_LIMIT_EXECUTE_PER_MINUTE` / `_DAY`                                                 | no        | `10` / `50`                                | Per-IP abuse gate                                       |
| `APP_DB_PASSWORD`, `TEMPORAL_DB_PASSWORD`                                                | no        | dev defaults                               | Internal-network Postgres credentials                   |
| `AUTH_ENABLED`                                                                           | no        | `false`                                    | Put the gatekeeper OIDC proxy in front (internal envs)  |
| `AUTH_DISCOVERY_URL`, `AUTH_CLIENT_ID`, `AUTH_SECRET`, `AUTH_COOKIE_SECRET`, `AUTH_ROLE` | when auth | —                                          | Gatekeeper config, same names as workflow-builder       |
| `REGISTRY`                                                                               | no        | `synergycodes.azurecr.io`                  | Image registry                                          |

## What differs from the workflow-builder playbook (and why)

| Deviation                                                                                         | Reason                                                                                                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres ×2 + Temporal services with named volumes, pinned via `node.labels.ai-studio-data==true` | AI Studio is stateful; Swarm volumes are node-local. **One-time setup:** `docker node update --label-add ai-studio-data=true <node>` |
| Migrations run post-deploy as a one-shot `docker run` on the stack network (with retries)         | Swarm ignores compose `depends_on` conditions                                                                                        |
| `internal` network is `attachable: true`                                                          | Lets the migrate container join the overlay                                                                                          |
| Services carry short DNS aliases (`backend`, `app-db`, `temporal`, …)                             | The web image's nginx proxies to `http://backend:3001`; aliases keep the images and env defaults identical between compose and Swarm |
| Gatekeeper is conditional (`AUTH_ENABLED`)                                                        | The WB-229 public demo is deliberately login-free; internal instances can keep SSO                                                   |

SSE note: Traefik streams responses by default, so the live execution stream
works without special ingress config; the 15 s backend heartbeat keeps the
connection alive.

## Open items for DevOps

- **Stateful workloads on the cluster** — this would be the first; the
  alternative is a dedicated VM running `deploy/ai-studio/docker-compose.yml`
  as-is, or managed Azure Postgres.
- **CI home** — this repo lives on GitHub; the existing deploy machinery
  (deployment CI image, `setup-az.sh`, Ansible inventory) is Bitbucket-side.
  First deploys can run from a workstation.
- **Secrets in the stack file** — the playbook writes env values (incl. the
  OpenRouter key) into the stack yml on the Swarm master, same as the
  existing workflow-builder flow. Docker Swarm secrets would be stricter;
  kept aligned for now.

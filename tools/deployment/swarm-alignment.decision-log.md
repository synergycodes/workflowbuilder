### Title: Swarm overlay aligned with the workflow-builder deployment

### Proposed by: Jan Librowski

### Date: 10.06.2026

## Context

The compose-based deployment in `deploy/ai-studio/` (see its decision log)
targets a single Docker host and ships TLS as a bring-your-own concern. The
company's actual Azure footprint, found in the `workflow-builder` repo's
`tools/deployment/`, is different: a self-managed Docker Swarm cluster with
Traefik (Let's Encrypt, host-based routing), images in ACR tagged by commit,
deployment via an Ansible playbook that writes a stack file onto the Swarm
master, and an optional gatekeeper OIDC proxy for internal apps. DevOps
operates that machinery daily.

Rather than choosing one target, the compose branch is kept as a snapshot
(`WB-229-ai-studio-deployment`) and this branch adds the Swarm-aligned path
on top of it.

## Decision

Add `tools/deployment/` mirroring the workflow-builder repo's structure —
`scripts/build-docker.sh`, `scripts/deploy.sh`,
`ansible/deploy-application/main.yml` — with the same conventions: ACR
commit-tagged images, per-environment stack names (`ai-studio--dev`),
Traefik labels copied from the existing stack, Bitbucket-style env variables
honored with workstation fallbacks.

**The images are shared, not duplicated.** Both paths build the same three
targets from `deploy/ai-studio/Dockerfile`; the overlay only changes
orchestration. Four deliberate deviations from the workflow-builder
playbook, all forced by AI Studio being stateful where the editor demo was
a static frontend:

1. Database/Temporal services with named volumes pinned to a labeled node
   (`node.labels.ai-studio-data==true`) — Swarm volumes are node-local.
2. Migrations as a post-deploy one-shot `docker run` with retries — Swarm
   ignores compose `depends_on` conditions, so the ordering that compose
   expressed declaratively lives in the playbook.
3. An `attachable` internal network plus short DNS aliases (`backend`,
   `app-db`, `temporal`) so the unmodified web image's nginx upstream and
   the compose env defaults resolve identically under Swarm.
4. Gatekeeper made conditional (`AUTH_ENABLED`, default off) — the public
   demo is login-free by design; internal stage/dev instances can keep SSO.

## Alternative Options Considered

- **Compose on a dedicated VM only** (the snapshot branch) — fully working
  and remains the customer-facing artifact; rejected as the _only_ path
  because it adds a second ops surface (new VM, separate TLS) when a
  maintained cluster exists.
- **Kubernetes/AKS manifests** — nothing in the org runs on k8s per the
  available evidence; would be infrastructure invention, not alignment.
- **Managed Azure Postgres instead of in-cluster databases** — cleaner
  state story, but contradicts the near-zero-cost requirement for a demo
  whose data is explicitly ephemeral; revisit for sustained load.
- **Swarm secrets for the OpenRouter key** — stricter than env-in-stack-file,
  but diverges from how the existing playbook handles `AUTH_SECRET`;
  consistency won for now, flagged in the README.

## Consequences

- **Pros**
  - DevOps sees the exact shape they already operate; review is a diff
    against a known playbook, not a new system.
  - TLS, registry auth, and routing are inherited from cluster-level
    Traefik instead of being re-solved per deployment.
  - Stack template render-verified in both auth modes (YAML parses; correct
    public surface and Traefik port in each).
- **Cons**
  - Not exercised against a real cluster yet — inventory, ACR push rights,
    the `ai-studio-data` node label, and the first stateful workload on the
    cluster all need DevOps sign-off.
  - The rate limiter's `X-Forwarded-For` trust now spans Traefik (and
    optionally gatekeeper) before nginx; the first-hop assumption should be
    verified on the real cluster.
  - Secrets land in a stack file on the Swarm master's disk (inherited
    trade-off from the existing flow).

## Status

Proposed — pending the DevOps conversation

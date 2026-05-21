### Title: Independent docs deployment strategy

### Date: 05.03.2026

## Context

WB docs (Astro/Starlight) live in the monorepo alongside the main application but
have a different lifecycle. Sometimes we update only docs without changing WB code.
The community version published to GitHub does not include `apps/docs/`, so
deployment must happen from Bitbucket Pipelines.

We need two environments: **dev** and **prod**, with an independent deployment cycle.

## Decision

Hybrid approach - automatic deploy to dev + manual deploy to prod,
with an additional automatic deploy to prod on WB release.

### Triggers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCS DEV                                     │
│                                                                     │
│  1. Push to master (when apps/docs/** changed)     [AUTOMATIC]     │
│     - condition > changesets > includePaths                         │
│     - skipped when docs haven't changed                            │
│                                                                     │
│  2. Custom pipeline: deploy-docs-dev               [MANUAL]        │
│     - from any branch                                               │
│     - useful for previewing from a feature branch                   │
├─────────────────────────────────────────────────────────────────────┤
│                        DOCS PROD                                    │
│                                                                     │
│  3. Pipeline release/* (on WB release)             [AUTOMATIC]     │
│     - docs prod updates together with the release                   │
│                                                                     │
│  4. Custom pipeline: deploy-docs-prod              [MANUAL]        │
│     - from any branch (typically master)                            │
│     - independent of WB release cycle                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow

```
                    ┌──────────┐
                    │  master  │
                    └────┬─────┘
                         │ push
                         ▼
               ┌─────────────────────┐
               │ Did apps/docs/**    │
               │ change?             │
               └──┬──────────────┬───┘
                  │ yes          │ no
                  ▼              ▼
          ┌──────────────┐   (stage skipped)
          │ Build docs   │
          │ Deploy DEV   │
          └──────────────┘


                   ┌────────────┐
                   │ release/*  │
                   └─────┬──────┘
                         │ push
                         ▼
          ┌──────────────────────────────┐
          │ Build + deploy SWA (app)     │
          │ Push GitHub (community)      │
          │ Build docs + deploy PROD     │  <-- new step
          └──────────────────────────────┘


                  ┌──────────────────┐
                  │ Custom pipeline  │  (manually from Bitbucket UI)
                  └───────┬──────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
       deploy-docs-dev      deploy-docs-prod
       (any branch)         (any branch)
```

### Infrastructure

| Resource                   | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| Azure SWA (docs-dev)       | Dev environment                                      |
| Azure SWA (docs-prod)      | Prod environment                                     |
| `SWA_TOKEN`                | Deployment token (per BB deployment environment)     |
| `SWA_ENV`                  | SWA environment name (per BB deployment environment) |
| Deployment env `docs-dev`  | Bitbucket environment                                |
| Deployment env `docs-prod` | Bitbucket environment                                |

### New steps in `bitbucket-pipelines.yml`

| Step           | Description                                  |
| -------------- | -------------------------------------------- |
| `&build_docs`  | `pnpm --filter @workflow-builder/docs build` |
| `&deploy_docs` | Deploy to Azure SWA to target environment    |

## Alternatives Considered

**Branch pipelines only (automatic)** - does not cover the scenario of independent
docs prod deploy, because `release/*` is tied to the WB release cycle.

**Custom pipelines only (manual)** - loses automation on dev. Someone has to
remember to trigger a deploy after every docs change on master.

## Consequences

- Docs changes on master automatically land on dev (zero manual work)
- Docs prod deploy is independent of WB releases (custom pipeline)
- WB releases automatically update docs prod (no desynchronization)
- Two new Azure SWA resources to maintain
- Existing WB pipelines (`release/*`, `master`) require minimal changes
- `release/*` pipeline gets slightly longer due to docs build + deploy

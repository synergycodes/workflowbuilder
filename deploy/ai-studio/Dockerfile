# syntax=docker/dockerfile:1

# AI Studio execution stack — single Dockerfile, multiple targets:
#
#   runtime  -> backend + execution-worker (command chosen per compose service)
#   web      -> nginx serving the AI Studio SPA + reverse proxy to the backend
#
# Database migrations run inside the backend at boot (drizzle-orm's
# programmatic migrator over apps/backend/drizzle/), so there is no separate
# migration image or deploy step.
#
# Build context must be the repo root (workspace packages are linked via
# pnpm `workspace:*`), e.g.:
#
#   docker build -f deploy/ai-studio/Dockerfile --target runtime .
#
# Node is pinned to the exact engines.node version because the workspace sets
# engineStrict=true. pnpm is installed via npm, not corepack — the corepack
# bundled with this Node release fails to load pnpm 10
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING) and ships stale signature keys.
# Keep the version in sync with `packageManager` in the root package.json.
FROM node:22.12.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    # root `prepare` script runs husky, which needs the .git dir that is
    # deliberately excluded from the build context
    HUSKY=0 \
    npm_config_store_dir=/pnpm/store \
    CI=true
RUN npm install -g pnpm@10.17.0
WORKDIR /app

# Download every dependency from the lockfile alone, then bring in the
# source. Any source change invalidates only the layers below the COPY —
# the package store survives in the cache mount, so reinstalls are cheap.
FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .

# Production deps for backend + worker and their workspace dependencies
# (execution-core, types). Both apps run TS directly through tsx — the
# Temporal worker additionally requires its workflow TS source on disk at
# runtime (the workflow sandbox bundles it from source), so there is no
# build step to get wrong.
FROM source AS runtime
# root `prepare` runs husky, a devDependency that a --prod install doesn't
# have — drop the script inside the image (root scripts are unused at runtime)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    npm pkg delete scripts.prepare && \
    pnpm install --frozen-lockfile --prefer-offline --prod \
    --filter backend... --filter execution-worker...
# command supplied by docker-compose:
#   backend: pnpm --filter backend start:prod
#   worker:  pnpm --filter execution-worker start:prod

# The SPA build imports the SDK from source (vite alias), so this needs the
# full frontend dependency tree. VITE_BACKEND_URL is baked in at build time;
# the default (empty) makes the app call /api on its own origin, which the
# web target's nginx proxies to the backend.
FROM source AS frontend-build
ARG VITE_BACKEND_URL=
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --filter @workflow-builder/ai-studio...
RUN VITE_BACKEND_URL=$VITE_BACKEND_URL pnpm build:ai-studio

FROM nginx:1.31-alpine AS web
COPY deploy/ai-studio/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist/apps/ai-studio /usr/share/nginx/html

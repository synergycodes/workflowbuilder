# Targets: runtime (backend + worker, command chosen per compose service),
# web (nginx, SPA + /api proxy). Build context must be the repo root —
# workspace packages are linked via pnpm `workspace:*`.
#
# No `# syntax=` line on purpose: it would pull the build frontend from Docker Hub
# as an unpinned fourth download. Needs Docker Engine 23+ (built-in BuildKit frontend).
#
# Exact Node pin: engineStrict rejects any other version. pnpm via npm, not
# corepack — this Node's corepack cannot load pnpm 10
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING). Keep in sync with `packageManager`.
#
# The cache mount only spares the npm download on rebuilds. This step and `pnpm fetch`
# are the two that need the registry, which is why an air-gapped host loads prebuilt
# images instead of building (README "Air-gapped / offline install").
FROM node:22.12.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    # husky needs the .git dir that the build context excludes
    HUSKY=0 \
    npm_config_store_dir=/pnpm/store \
    CI=true
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install -g pnpm@10.17.0 --prefer-offline
WORKDIR /app

# `useNodeVersion` would make pnpm download Node from nodejs.org for lifecycle scripts:
# fatal with no network, redundant on this base image (engineStrict still pins it).
# Stripped in the image only, twice because `COPY . .` restores the file.
FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --network=none sed -i '/^useNodeVersion:/d' pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --network=none sed -i '/^useNodeVersion:/d' pnpm-workspace.yaml

# @workflowbuilder/temporal is the one workspace dependency of backend/worker that
# ships built output: its `exports` point at ./dist, and .dockerignore keeps dist out
# of the build context. It cannot build itself during the runtime install either,
# because tsup is a devDependency and that install is --prod. So it is built here,
# with dev dependencies present, and only the result is carried over.
FROM source AS package-build
RUN --network=none --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @workflowbuilder/temporal...
RUN --network=none pnpm build:temporal

# tsx runs TS directly — required anyway for the worker, whose workflow
# sandbox bundles from TS source on disk at runtime.
#
# Every RUN after `pnpm fetch` is --network=none: `--offline` stops only pnpm's
# resolver, not lifecycle scripts or builds. tools/check-offline-build.mjs
# enforces it from `pnpm check`.
#
# Inherits the whole-lockfile virtual store that `pnpm fetch` materialised (~1.5 GB,
# docs and release toolchains included). A clean stage fed by `pnpm deploy --prod`
# would ship only backend + worker (follow-up: slim-runtime-image).
FROM source AS runtime
COPY --from=package-build /app/packages/temporal/dist ./packages/temporal/dist
RUN --network=none --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    # `prepare` runs husky at the root, and `tsup` in packages/temporal — neither is
    # available in a --prod install, and the dist copied above is what it would produce
    npm pkg delete scripts.prepare && \
    (cd packages/temporal && npm pkg delete scripts.prepare) && \
    pnpm install --frozen-lockfile --offline --prod \
    --filter backend... --filter execution-worker...

# VITE_BACKEND_URL is baked at build time; empty = same-origin /api,
# proxied by the web target's nginx.
FROM source AS frontend-build
ARG VITE_BACKEND_URL=
RUN --network=none --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @workflow-builder/ai-studio...
RUN --network=none VITE_BACKEND_URL=$VITE_BACKEND_URL pnpm build:ai-studio

FROM nginx:1.31-alpine AS web
COPY deploy/ai-studio/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist/apps/ai-studio /usr/share/nginx/html

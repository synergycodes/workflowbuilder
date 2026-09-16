# syntax=docker/dockerfile:1

# Targets: runtime (backend + worker, command chosen per compose service),
# web (nginx, SPA + /api proxy). Build context must be the repo root —
# workspace packages are linked via pnpm `workspace:*`.
#
# Exact Node pin: engineStrict rejects any other version. pnpm via npm, not
# corepack — this Node's corepack cannot load pnpm 10
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING). Keep in sync with `packageManager`.
FROM node:22.12.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    # husky needs the .git dir that the build context excludes
    HUSKY=0 \
    npm_config_store_dir=/pnpm/store \
    CI=true
RUN npm install -g pnpm@10.17.0
WORKDIR /app

FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .

# @workflowbuilder/temporal is the one workspace dependency of backend/worker that
# ships built output: its `exports` point at ./dist, and .dockerignore keeps dist out
# of the build context. It cannot build itself during the runtime install either,
# because tsup is a devDependency and that install is --prod. So it is built here,
# with dev dependencies present, and only the result is carried over.
FROM source AS package-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --filter @workflowbuilder/temporal...
RUN pnpm build:temporal

# tsx runs TS directly — required anyway for the worker, whose workflow
# sandbox bundles from TS source on disk at runtime.
# --prefer-offline (not --offline): offline mode leaks into lifecycle
# scripts and breaks the icons build, which shells out to npx.
FROM source AS runtime
COPY --from=package-build /app/packages/temporal/dist ./packages/temporal/dist
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    # `prepare` runs husky at the root, and `tsup` in packages/temporal — neither is
    # available in a --prod install, and the dist copied above is what it would produce
    npm pkg delete scripts.prepare && \
    (cd packages/temporal && npm pkg delete scripts.prepare) && \
    pnpm install --frozen-lockfile --prefer-offline --prod \
    --filter backend... --filter execution-worker...

# VITE_BACKEND_URL is baked at build time; empty = same-origin /api,
# proxied by the web target's nginx.
FROM source AS frontend-build
ARG VITE_BACKEND_URL=
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --filter @workflow-builder/ai-studio...
RUN VITE_BACKEND_URL=$VITE_BACKEND_URL pnpm build:ai-studio

FROM nginx:1.31-alpine AS web
COPY deploy/ai-studio/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist/apps/ai-studio /usr/share/nginx/html

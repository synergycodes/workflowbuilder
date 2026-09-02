# syntax=docker/dockerfile:1

# Targets: runtime (backend + worker, command chosen per compose service),
# web (nginx, SPA + /api proxy). Build context must be the repo root —
# workspace packages are linked via pnpm `workspace:*`.
#
# Exact Node pin: engineStrict rejects any other version. pnpm via npm, not
# corepack — this Node's corepack cannot load pnpm 10
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING). Keep in sync with `packageManager`.
#
# The cache mount keeps npm's download out of the image layer and lets repeat
# builds reuse it. It does NOT make this step work without a network: fetching
# pnpm is the one part of the build that always needs the registry, which is why
# an air-gapped host loads prebuilt images instead of building — see the README's
# "Air-gapped / offline install".
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

# `useNodeVersion` makes pnpm download its own Node from nodejs.org to run lifecycle
# scripts — pointless when the base image is already that exact version, and fatal
# with no network. Stripped in the image only, so local dev keeps managed Node;
# engineStrict plus the root `engines` still reject a mismatched base image.
# Applied twice because `COPY . .` restores the original file.
FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN sed -i '/^useNodeVersion:/d' pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN sed -i '/^useNodeVersion:/d' pnpm-workspace.yaml

# @workflowbuilder/temporal is the one workspace dependency of backend/worker that
# ships built output: its `exports` point at ./dist, and .dockerignore keeps dist out
# of the build context. It cannot build itself during the runtime install either,
# because tsup is a devDependency and that install is --prod. So it is built here,
# with dev dependencies present, and only the result is carried over.
FROM source AS package-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @workflowbuilder/temporal...
RUN pnpm build:temporal

# tsx runs TS directly — required anyway for the worker, whose workflow
# sandbox bundles from TS source on disk at runtime.
#
# Every install is strict --offline: past the pnpm bootstrap in `base` and
# `pnpm fetch` above, no step needs the network — and every ordinary build
# proves it, because a dependency that sneaks past the lockfile into a
# mid-install download fails right here instead of quietly keeping the image
# registry-dependent.
FROM source AS runtime
COPY --from=package-build /app/packages/temporal/dist ./packages/temporal/dist
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
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
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter @workflow-builder/ai-studio...
RUN VITE_BACKEND_URL=$VITE_BACKEND_URL pnpm build:ai-studio

FROM nginx:1.31-alpine AS web
COPY deploy/ai-studio/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/dist/apps/ai-studio /usr/share/nginx/html

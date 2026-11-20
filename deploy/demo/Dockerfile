# syntax=docker/dockerfile:1

# Targets: runtime (backend + worker, command chosen per compose service),
# web (nginx, executable demo SPA + /api proxy). Build context must be the
# repo root because workspace packages are linked via pnpm `workspace:*`.
#
# Exact Node pin: engineStrict rejects any other version. pnpm via npm, not
# corepack — this Node's corepack cannot load pnpm 10
# (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING). Keep in sync with `packageManager`.
FROM node:22.12.0-bookworm-slim AS base

# husky needs the .git dir that the build context excludes
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH" \
    HUSKY=0 \
    npm_config_store_dir=/pnpm/store \
    CI=true
RUN npm install -g pnpm@10.17.0
WORKDIR /app

FROM base AS source
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .

# tsx runs TS directly — required anyway for the worker, whose workflow
# sandbox bundles from TS source on disk at runtime.
# --prefer-offline (not --offline): offline mode leaks into lifecycle
# scripts and breaks the icons build, which shells out to npx.
FROM source AS runtime
# `prepare` runs husky, absent from a --prod install
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    npm pkg delete scripts.prepare && \
    pnpm install --frozen-lockfile --prefer-offline --prod \
    --filter backend... --filter execution-worker...

FROM source AS frontend-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline \
    --filter @workflow-builder/executable-demo...
RUN pnpm --filter @workflow-builder/executable-demo build

FROM nginx:1.31-alpine AS web
COPY --chown=nginx:nginx deploy/demo/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx --from=frontend-build /app/dist/apps/executable-demo /usr/share/nginx/html
RUN sed -i 's/^user  nginx;/# user directive disabled for rootless runtime;/' /etc/nginx/nginx.conf && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx \
    /etc/nginx/conf.d \
    /usr/share/nginx/html \
    /var/cache/nginx \
    /var/run/nginx.pid
USER nginx
EXPOSE 8080

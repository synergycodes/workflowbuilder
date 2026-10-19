import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { checkOfflineBuild } from './check-offline-build.mjs';

const dockerfile = (...afterFetch) =>
  [
    'FROM node:22 AS base',
    'RUN npm install -g pnpm',
    'FROM base AS source',
    'RUN --mount=type=cache,target=/pnpm/store pnpm fetch',
    'COPY . .',
    ...afterFetch,
  ].join('\n');

const passes = (text) => assert.deepEqual(checkOfflineBuild(text).errors, []);
const fails = (text, pattern) => assert.match(checkOfflineBuild(text).errors.join('\n'), pattern);

test('passes the real deploy/ai-studio/Dockerfile', () => {
  passes(readFileSync(new URL('../deploy/ai-studio/Dockerfile', import.meta.url), 'utf8'));
});

test('allows network before the pnpm fetch boundary and none after it', () => {
  passes(dockerfile('RUN --network=none pnpm install --offline'));
});

test('rejects a # syntax= directive', () => {
  fails(`# syntax=docker/dockerfile:1\n${dockerfile()}`, /# syntax=/);
});

test('rejects a Dockerfile with no pnpm fetch step', () => {
  fails('FROM node:22\nRUN --network=none true', /no `pnpm fetch` step/);
});

test('rejects a pnpm fetch step with a chained command', () => {
  fails('FROM node:22\nRUN pnpm fetch && curl https://example.com', /line 2: .*must run nothing else/);
});

test('rejects a RUN after the boundary without --network=none', () => {
  fails(dockerfile('RUN pnpm install --offline'), /line 6: RUN pnpm install --offline/);
});

test('rejects --network=none that sits in the shell command instead of the instruction flags', () => {
  fails(dockerfile('RUN echo --network=none'), /line 6/);
});

test('rejects a RUN that pairs --network=none with another network mode', () => {
  fails(dockerfile('RUN --network=none --network=host true'), /line 6/);
});

test('rejects ADD of a URL or git remote, allows ADD of a local file', () => {
  fails(dockerfile('ADD https://example.com/x.tgz /x'), /line 6: ADD https/);
  fails(dockerfile('ADD git@github.com:org/repo.git /src'), /line 6: ADD git@/);
  passes(dockerfile('ADD vendor.tgz /x'));
});

test('rejects COPY --from an image, allows a stage name or index', () => {
  fails(dockerfile('COPY --from=nginx:1.27 /etc/nginx /etc/nginx'), /line 6: COPY --from=nginx/);
  passes(dockerfile('COPY --from=Base /app /app', 'COPY --from=0 /app /app'));
});

test('rejects a mount from an image, allows a mount from a stage', () => {
  fails(dockerfile('RUN --network=none --mount=type=bind,from=alpine:3,target=/a true'), /line 6/);
  passes(dockerfile('RUN --network=none --mount=type=bind,from=source,target=/a true'));
});

test('folds continuation lines and interleaved comments into one instruction', () => {
  passes(dockerfile('RUN --network=none \\', '  # build the package', '  pnpm build'));
  fails(dockerfile('RUN \\', '  pnpm build'), /line 6: RUN pnpm build/);
});

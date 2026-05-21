// Cross-platform replacement for the previous bash `until curl … sleep … done` loop.
// Polls the Temporal UI port and exits 0 once it answers; falls back to fetch's own
// timeout signalling so we don't hang forever if Temporal never comes up.
import process from 'node:process';

// Use 127.0.0.1 (not `localhost`) to match the loopback-only docker binding from
// `apps/backend/docker-compose.yml`. On Windows, Node subprocesses spawned via
// pnpm chains can resolve `localhost` to `::1` (IPv6) first, which fails because
// the docker port is bound to 127.0.0.1 only. See `apps/backend/local-dev-binding.decision-log.md`.
const TEMPORAL_URL = 'http://127.0.0.1:8233';
const INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

const deadline = Date.now() + TIMEOUT_MS;

async function isUp() {
  try {
    const response = await fetch(TEMPORAL_URL, { signal: AbortSignal.timeout(INTERVAL_MS) });
    return response.ok;
  } catch {
    return false;
  }
}

let ready = false;
while (Date.now() < deadline) {
  if (await isUp()) {
    ready = true;
    break;
  }
  console.log('Waiting for Temporal...');
  await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
}

if (ready) {
  console.log('Temporal ready');
} else {
  console.error(`❌ Temporal did not become ready at ${TEMPORAL_URL} within ${TIMEOUT_MS / 1000}s`);
  process.exitCode = 1;
}

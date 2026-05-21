// Preflight: verifies the host can run the Workflow Builder dev stack.
//
// Run with `pnpm preflight` (add `--json` for an agent-friendly structured
// report). Exits 0 when nothing has failed, 1 otherwise.
//
// Named `preflight` rather than `doctor` because `pnpm doctor` is a built-in
// pnpm command and would shadow a user script of the same name.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// A check returns { name, status, detail }. Status semantics:
//   'pass' — satisfied
//   'warn' — not satisfied but does not block readiness (optional .env,
//            any port occupied, Docker absent for Path A). Vite / Hono /
//            docker-compose surface the precise error at boot if the port
//            is actually held by a foreign process.
//   'fail' — blocks readiness; the script exits 1. Reserved for missing
//            runtime tooling (Node / pnpm versions).

// ---------- Runtime probes ----------

// Tolerates engines specifiers like ">=22.12.0", "^22.12.0", "22.12.x", and
// pre-release tails like "22.12.0-rc.1". Strips a leading range prefix, drops
// any "-prerelease" tail, and falls back to 0 for unparseable segments so a
// malformed input never throws — it just compares structurally.
function semverGte(current, required) {
  const normalize = (v) =>
    String(v ?? '0')
      .replace(/^[\^~>=v]+/, '')
      .split('-')[0]
      .split('.')
      .map((p) => Number.parseInt(p, 10) || 0);
  const [ca = 0, cb = 0, cc = 0] = normalize(current);
  const [ra = 0, rb = 0, rc = 0] = normalize(required);
  if (ca !== ra) return ca > ra;
  if (cb !== rb) return cb > rb;
  return cc >= rc;
}

function runCmd(cmd, args, timeoutMs = 3000) {
  return new Promise((resolve) => {
    // shell: true on Windows so PATHEXT resolves `.cmd` / `.bat` shims
    // (pnpm ships as pnpm.cmd). Args here are fixed strings, so this is
    // not a shell-injection vector.
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    });
    let stdout = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: -1, stdout });
    }, timeoutMs);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ code: -1, stdout });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout });
    });
  });
}

function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

// ---------- Individual checks ----------

async function checkNode() {
  const required = PKG.engines.node;
  const current = process.versions.node;
  return semverGte(current, required)
    ? { name: 'node', status: 'pass', detail: current }
    : { name: 'node', status: 'fail', detail: `${current} (need ${required})` };
}

// `pnpm --version` is normally just `X.Y.Z`, but corepack-on-demand downloads
// and update-available banners can prepend extra lines. Pick the last X.Y.Z
// match instead of trusting raw stdout.
function extractVersion(stdout) {
  return stdout.match(/\d+\.\d+\.\d+/g)?.at(-1) ?? '';
}

async function checkPnpm() {
  const required = String(PKG.engines.pnpm);
  const { code, stdout } = await runCmd('pnpm', ['--version']);
  if (code !== 0) return { name: 'pnpm', status: 'fail', detail: 'not installed' };
  const current = extractVersion(stdout);
  if (!current) {
    return {
      name: 'pnpm',
      status: 'fail',
      detail: `unparseable output: ${stdout.trim().slice(0, 80)}`,
    };
  }
  return semverGte(current, required)
    ? { name: 'pnpm', status: 'pass', detail: current }
    : { name: 'pnpm', status: 'fail', detail: `${current} (need ${required})` };
}

async function checkDocker() {
  const { code } = await runCmd('docker', ['info']);
  return code === 0
    ? { name: 'docker', status: 'pass', detail: 'running' }
    : { name: 'docker', status: 'warn', detail: 'not running (only needed for Path B)' };
}

// App ports may be held by the user's own running dev server, another local
// service, or just be free. Status is `warn` (informational) rather than
// `fail` so preflight doesn't block `pnpm dev:ai-studio` for legitimate
// workflows like running `pnpm dev:backend` in a separate terminal. Vite /
// Hono will fail-fast with a precise EADDRINUSE if the port is actually
// taken by a foreign process at boot time.
async function checkAppPort(port, label) {
  const free = await isPortFree(port);
  return free
    ? { name: `port_${port}`, status: 'pass', detail: `free (${label})` }
    : {
        name: `port_${port}`,
        status: 'warn',
        detail: `in use (${label}) — your dev server may already be running, or another process holds the port`,
      };
}

// Service ports are typically held by the dev stack's docker containers, but
// we can't tell that apart from another local service on the same port without
// inspecting the docker socket. Stay neutral.
async function checkServicePort(port, label) {
  const free = await isPortFree(port);
  return free
    ? { name: `port_${port}`, status: 'pass', detail: `free (${label})` }
    : {
        name: `port_${port}`,
        status: 'warn',
        detail: `in use (${label}) — may be the dev stack or another local service`,
      };
}

async function checkEnvFile(relPath) {
  const present = existsSync(path.join(ROOT, relPath));
  return present
    ? { name: relPath, status: 'pass', detail: 'present' }
    : { name: relPath, status: 'warn', detail: `missing — copy from ${relPath}.example` };
}

// ---------- Composition ----------

function runAllChecks() {
  return Promise.all([
    checkNode(),
    checkPnpm(),
    checkDocker(),
    checkAppPort(3001, 'backend'),
    checkAppPort(4200, 'demo'),
    checkAppPort(4201, 'ai-studio'),
    checkServicePort(5432, 'postgres'),
    checkServicePort(5433, 'temporal-db'),
    checkServicePort(7233, 'temporal'),
    checkServicePort(8233, 'temporal-ui'),
    checkEnvFile('apps/backend/.env'),
    checkEnvFile('apps/execution-worker/.env'),
  ]);
}

// ---------- Rendering ----------

const ICON = { pass: '✅', warn: '⚠️ ', fail: '❌' };

function renderHuman(checks, ok) {
  const nameWidth = Math.max(...checks.map((c) => c.name.length));
  const rows = checks.map((c) => `${ICON[c.status]} ${c.name.padEnd(nameWidth)}  ${c.detail}`);
  const footer = ok
    ? 'Ready to go. Pick a path in README.md "Get started".'
    : 'Fix the ❌ items above, then run pnpm preflight again.';
  return ['Workflow Builder preflight', '', ...rows, '', footer].join('\n');
}

function renderJson(checks, ok) {
  return JSON.stringify({ ok, checks }, null, 2);
}

// ---------- Entry point ----------

const checks = await runAllChecks();
const ok = checks.every((c) => c.status !== 'fail');
const output = process.argv.includes('--json') ? renderJson(checks, ok) : renderHuman(checks, ok);

process.stdout.write(output + '\n');
process.exitCode = ok ? 0 : 1;

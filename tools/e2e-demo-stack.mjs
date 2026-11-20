#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

const composeFile = 'deploy/demo/docker-compose.yml';
const projectName = `workflow-builder-demo-e2e-${process.pid}`;
const includeLiveAi = process.argv.includes('--include-live-ai');
const env = {
  ...process.env,
  COMPOSE_PROJECT_NAME: projectName,
  WEB_BIND: '127.0.0.1',
  WEB_PORT: process.env['WEB_PORT'] ?? '4212',
  TEMPORAL_BIND: '127.0.0.1',
  TEMPORAL_PORT: process.env['TEMPORAL_PORT'] ?? '7243',
  TEMPORAL_UI_BIND: '127.0.0.1',
  TEMPORAL_UI_PORT: process.env['TEMPORAL_UI_PORT'] ?? '8243',
  OPENROUTER_API_KEY: process.env['OPENROUTER_API_KEY'] ?? '',
};

async function run(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: process.platform === 'win32',
    });
    let output = '';
    child.stdout?.on('data', (chunk) => (output += chunk));
    child.stderr?.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${output}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch {
      // Stack is still converging.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  if (includeLiveAi && !env.OPENROUTER_API_KEY) {
    throw new Error('--include-live-ai requires OPENROUTER_API_KEY');
  }

  try {
    await run('docker', ['compose', '-f', composeFile, 'config', '--quiet']);
    await run('docker', ['compose', '-f', composeFile, 'up', '-d', '--build', '--wait', '--wait-timeout', '180']);

    const origin = `http://${env.WEB_BIND}:${env.WEB_PORT}`;
    await waitForHttp(`${origin}/api/health`);

    const logs = await run('docker', ['compose', '-f', composeFile, 'logs', '--no-color', 'worker'], {
      capture: true,
    });
    if (!logs.includes('demo-workflow-execution')) {
      throw new Error('Demo worker did not report the demo-workflow-execution task queue');
    }

    console.log(`Executable demo stack is healthy at ${origin}`);
    console.log('Run browser/API execution assertions against the checked-in templates from this origin.');
    if (includeLiveAi) console.log('Live AI mode enabled.');
  } finally {
    await run('docker', ['compose', '-f', composeFile, 'down', '--volumes', '--remove-orphans']).catch((error) => {
      console.error(String(error));
    });
  }
}

await main();

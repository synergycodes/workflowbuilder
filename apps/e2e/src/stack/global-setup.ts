import { TestWorkflowEnvironment } from '@temporalio/testing';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { startFakeLlm } from '../fake-llm/server';
import { startProcess } from './child-process';
import { createDatabase } from './database';
import { assertPortFree } from './ports';
import { settings } from './settings';

type Cleanup = () => Promise<void>;

const INHERITED_BUT_OWNED = /^(AI_|TEMPORAL_|RATE_LIMIT_|VITE_|TAVILY_|TURNSTILE_|ALLOWED_ORIGINS$|TRUST_PROXY$|HOST$)/;

function stackEnv(own: Record<string, string>): NodeJS.ProcessEnv {
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !INHERITED_BUT_OWNED.test(name)));
  // Backend and worker load `.env` from their own folder through dotenv; an empty file keeps a developer's keys out.
  return { ...inherited, DOTENV_CONFIG_PATH: os.devNull, DOTENV_CONFIG_QUIET: 'true', ...own };
}

function assertBuilt(packageDirectory: string, buildCommand: string) {
  if (!existsSync(path.join(settings.repoDirectory, packageDirectory, 'dist'))) {
    throw new Error(`${packageDirectory}/dist is missing. Run \`${buildCommand}\` (or \`pnpm install\`) first.`);
  }
}

async function assertHealthy(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`);
  }
}

async function startStack(cleanups: Cleanup[]) {
  if (process.platform === 'win32') {
    throw new Error('pnpm e2e runs on macOS and Linux only. On Windows, run it inside WSL2.');
  }
  assertBuilt('packages/temporal', 'pnpm build:temporal');
  assertBuilt('packages/ui', 'pnpm build:ui');
  await assertPortFree(settings.backendPort, 'e2e backend', 'E2E_BACKEND_PORT');
  await assertPortFree(settings.appPort, 'e2e AI Studio', 'E2E_APP_PORT');
  await assertPortFree(settings.fakeLlmPort, 'fake LLM', 'E2E_LLM_PORT');
  await mkdir(settings.stackLogDirectory, { recursive: true });

  const database = await createDatabase(settings.postgresUrl);
  cleanups.push(database.drop);

  const temporal = await TestWorkflowEnvironment.createLocal();
  cleanups.push(() => temporal.teardown());

  const fakeLlm = await startFakeLlm(settings.fakeLlmPort);
  cleanups.push(fakeLlm.close);

  const pnpm = { command: 'pnpm', cwd: settings.repoDirectory, logDirectory: settings.stackLogDirectory };
  const serverEnv = {
    DATABASE_URL: database.url,
    TEMPORAL_ADDRESS: temporal.address,
    AI_API_KEY: 'fake-llm-key',
    AI_BASE_URL: `${settings.fakeLlmUrl}/v1`,
    AI_MODEL: 'fake-model',
  };

  const backend = await startProcess({
    ...pnpm,
    name: 'backend',
    args: ['--filter', '@workflow-builder/backend', 'start:prod'],
    env: stackEnv({ ...serverEnv, WB_AUTH_PORT: 'allow-all', PORT: String(settings.backendPort) }),
    readyText: 'backend listening',
    timeoutMs: 60_000,
  });
  cleanups.push(backend.stop);
  await assertHealthy(`${settings.backendUrl}/api/health`);

  const worker = await startProcess({
    ...pnpm,
    name: 'worker',
    args: ['--filter', '@workflow-builder/execution-worker', 'start:prod'],
    env: stackEnv(serverEnv),
    readyText: 'execution worker started',
    timeoutMs: 120_000,
  });
  cleanups.push(worker.stop);

  const vite = ['--filter', '@workflow-builder/ai-studio', 'exec', 'vite'];
  await startProcess({
    ...pnpm,
    name: 'ai-studio-build',
    args: [...vite, 'build', '--outDir', settings.appBuildDirectory, '--emptyOutDir'],
    env: stackEnv({ VITE_BACKEND_URL: settings.backendUrl, VITE_TURNSTILE_SITE_KEY: '' }),
    timeoutMs: 180_000,
  });

  const preview = await startProcess({
    ...pnpm,
    name: 'ai-studio',
    args: [
      ...vite,
      'preview',
      '--outDir',
      settings.appBuildDirectory,
      '--host',
      '127.0.0.1',
      '--port',
      String(settings.appPort),
      '--strictPort',
    ],
    env: stackEnv({}),
    readyText: 'Local:',
    timeoutMs: 30_000,
  });
  cleanups.push(preview.stop);
  await assertHealthy(settings.appUrl);
}

export default async function globalSetup(): Promise<Cleanup> {
  const cleanups: Cleanup[] = [];

  async function stopStack() {
    const failures: unknown[] = [];
    for (const cleanup of cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'The e2e stack did not stop cleanly');
    }
  }

  try {
    await startStack(cleanups);
  } catch (error) {
    await stopStack().catch((stopError: unknown) => console.error(stopError));
    throw error;
  }
  return stopStack;
}

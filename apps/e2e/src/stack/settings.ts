import path from 'node:path';

function port(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name}: "${raw}" is not a port number`);
  }
  return value;
}

const workspaceDirectory = path.resolve(import.meta.dirname, '../..');
const backendPort = port('E2E_BACKEND_PORT', 3101);
const appPort = port('E2E_APP_PORT', 4301);
const fakeLlmPort = port('E2E_LLM_PORT', 4311);

export const settings = {
  workspaceDirectory,
  repoDirectory: path.resolve(workspaceDirectory, '../..'),
  outputDirectory: path.join(workspaceDirectory, 'test-results'),
  stackLogDirectory: path.join(workspaceDirectory, 'test-results', 'stack-logs'),
  appBuildDirectory: path.join(workspaceDirectory, 'dist', 'ai-studio'),
  postgresUrl: process.env['E2E_POSTGRES_URL'] || 'postgresql://wb:wb@127.0.0.1:5442/postgres',
  backendPort,
  backendUrl: `http://127.0.0.1:${backendPort}`,
  appPort,
  appUrl: `http://127.0.0.1:${appPort}`,
  fakeLlmPort,
  fakeLlmUrl: `http://127.0.0.1:${fakeLlmPort}`,
};

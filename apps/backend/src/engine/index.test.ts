import { afterEach, describe, expect, it, vi } from 'vitest';

// The engine module reads TEMPORAL_* when it is imported, so each case needs a fresh
// module and an environment free of whatever the runner's shell carries.
const TEMPORAL_NAMES = [
  'TEMPORAL_ADDRESS',
  'TEMPORAL_NAMESPACE',
  'TEMPORAL_TLS',
  'TEMPORAL_API_KEY',
  'TEMPORAL_TLS_CA_PATH',
  'TEMPORAL_TLS_CERT_PATH',
  'TEMPORAL_TLS_KEY_PATH',
];

async function loadEngine(values: Record<string, string> = {}) {
  vi.resetModules();
  for (const name of TEMPORAL_NAMES) {
    // undefined is Vitest's delete signal, and unstubAllEnvs restores the variable
    // eslint-disable-next-line unicorn/no-useless-undefined
    vi.stubEnv(name, undefined);
  }
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }
  return import('./index');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getWorkflowEngine', () => {
  it('rejects a contradictory TEMPORAL_* combination at import, not on the first submit', async () => {
    await expect(loadEngine({ TEMPORAL_TLS_CERT_PATH: '/tls/client.pem' })).rejects.toThrow(/TEMPORAL_TLS_CERT_PATH/);
  });

  it('builds the engine without reaching Temporal, so the backend boots while the cluster is down', async () => {
    const { getWorkflowEngine } = await loadEngine({ TEMPORAL_ADDRESS: '203.0.113.1:7233' });

    expect(getWorkflowEngine()).toBe(getWorkflowEngine());
  });
});

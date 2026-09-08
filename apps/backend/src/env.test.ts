import { afterEach, describe, expect, it, vi } from 'vitest';

import { env as shape } from './env';

// The keys of `env` are the variable names, so a variable added to env.ts is
// cleared here without anyone remembering to list it.
const ENV_NAMES = Object.keys(shape);

// env.ts reads process.env once at module load, so every case needs a fresh module
// and a clean environment: whatever the runner's shell carries is unset first.
async function loadEnv(values: Record<string, string>) {
  vi.resetModules();
  for (const name of ENV_NAMES) {
    // undefined is Vitest's delete signal, and unstubAllEnvs restores the variable
    // eslint-disable-next-line unicorn/no-useless-undefined
    vi.stubEnv(name, undefined);
  }
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }
  const module = await import('./env');
  return module.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadEnv', () => {
  it('ignores variables inherited from the runner', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'ambient-secret');

    const env = await loadEnv({});

    expect(env.TURNSTILE_SECRET_KEY).toBeNull();
  });
});

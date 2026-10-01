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

describe('local defaults', () => {
  // Not `localhost`: on some Windows / Node configs it resolves to ::1 first, which the
  // IPv4-only docker mapping rejects. See local-dev-binding.decision-log.md.
  it.each(['HOST', 'DATABASE_URL'] as const)('spells the loopback address of %s as 127.0.0.1', async (name) => {
    const env = await loadEnv({});

    expect(env[name]).toContain('127.0.0.1');
  });

  it('serves port 3001', async () => {
    const env = await loadEnv({});

    expect(env.PORT).toBe(3001);
  });

  it('reads a port that is set', async () => {
    const env = await loadEnv({ PORT: '8080' });

    expect(env.PORT).toBe(8080);
  });

  it('reads a database url that is set', async () => {
    const url = 'postgresql://wb:wb@app-db:5432/workflow_builder';
    const env = await loadEnv({ DATABASE_URL: url });

    expect(env.DATABASE_URL).toBe(url);
  });
});

describe('TRUST_PROXY', () => {
  // Decides whether X-Forwarded-For is believed, so only the exact string opts in:
  // anything else must leave the rate limiter keying on the socket address.
  it.each(['true'])('trusts the proxy on %s', async (value) => {
    const env = await loadEnv({ TRUST_PROXY: value });

    expect(env.TRUST_PROXY).toBe(true);
  });

  it.each(['TRUE', 'True', '1', 'yes', ''])('does not trust the proxy on %s', async (value) => {
    const env = await loadEnv({ TRUST_PROXY: value });

    expect(env.TRUST_PROXY).toBe(false);
  });

  it('does not trust the proxy when unset', async () => {
    const env = await loadEnv({});

    expect(env.TRUST_PROXY).toBe(false);
  });
});

describe('execute rate limits', () => {
  // server.ts mounts the limiter only when one of them is above zero, so the default
  // has to be the number 0 rather than NaN — `Number('')` and `Number(undefined)` differ.
  it.each(['RATE_LIMIT_EXECUTE_PER_MINUTE', 'RATE_LIMIT_EXECUTE_PER_DAY'] as const)(
    'leaves %s disabled by default',
    async (name) => {
      const env = await loadEnv({});

      expect(env[name]).toBe(0);
    },
  );

  it('reads both limits when they are set', async () => {
    const env = await loadEnv({ RATE_LIMIT_EXECUTE_PER_MINUTE: '10', RATE_LIMIT_EXECUTE_PER_DAY: '50' });

    expect(env).toMatchObject({ RATE_LIMIT_EXECUTE_PER_MINUTE: 10, RATE_LIMIT_EXECUTE_PER_DAY: 50 });
  });
});

describe('TURNSTILE_SECRET_KEY', () => {
  it('reads a secret that is set', async () => {
    const env = await loadEnv({ TURNSTILE_SECRET_KEY: 'secret' });

    expect(env.TURNSTILE_SECRET_KEY).toBe('secret');
  });
});

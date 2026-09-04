import { afterEach, describe, expect, it, vi } from 'vitest';

// env.ts reads process.env once at module load, so every case needs a fresh module.
async function loadEnv(values: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(values)) {
    vi.stubEnv(name, value);
  }
  const module = await import('./env');
  return module.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AI_API_KEY', () => {
  it('reads AI_API_KEY', async () => {
    const env = await loadEnv({ AI_API_KEY: 'key' });

    expect(env.AI_API_KEY).toBe('key');
  });

  it('reads an empty value as unset', async () => {
    const env = await loadEnv({ AI_API_KEY: '' });

    expect(env.AI_API_KEY).toBeNull();
  });

  // The alias was dropped rather than scoped: a provider-named key that silently
  // applies to any AI_BASE_URL is a credential leak waiting to happen, and there are
  // no external deployments to keep working. Rename the variable in .env instead.
  it('does not read the retired OPENROUTER_API_KEY name', async () => {
    const env = await loadEnv({ AI_API_KEY: '', OPENROUTER_API_KEY: 'old-key' });

    expect(env.AI_API_KEY).toBeNull();
  });
});

describe('AI_BASE_URL and AI_MODEL', () => {
  // No built-in endpoint or model: the OpenRouter values live in .env.example only.
  it('are null when unset', async () => {
    const env = await loadEnv({ AI_BASE_URL: '', AI_MODEL: '' });

    expect(env.AI_BASE_URL).toBeNull();
    expect(env.AI_MODEL).toBeNull();
  });

  it('points at any OpenAI-compatible endpoint', async () => {
    const env = await loadEnv({ AI_BASE_URL: 'http://vllm.internal:8000/v1' });

    expect(env.AI_BASE_URL).toBe('http://vllm.internal:8000/v1');
  });
});

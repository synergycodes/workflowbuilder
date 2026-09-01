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
  // The worker used to throw at module load without a key. Booting keyless is the
  // point: a deployment that runs no AI nodes should not need an LLM account.
  it('is null when unset, rather than refusing to load', async () => {
    const env = await loadEnv({ AI_API_KEY: '', OPENROUTER_API_KEY: '' });

    expect(env.AI_API_KEY).toBeNull();
  });

  it('takes AI_API_KEY when both names are set', async () => {
    const env = await loadEnv({ AI_API_KEY: 'new-key', OPENROUTER_API_KEY: 'old-key' });

    expect(env.AI_API_KEY).toBe('new-key');
  });

  it('falls back to OPENROUTER_API_KEY so existing deployments keep working', async () => {
    const env = await loadEnv({ AI_API_KEY: '', OPENROUTER_API_KEY: 'old-key' });

    expect(env.AI_API_KEY).toBe('old-key');
  });
});

describe('AI_BASE_URL', () => {
  it('defaults to OpenRouter', async () => {
    const env = await loadEnv({});

    expect(env.AI_BASE_URL).toBe('https://openrouter.ai/api/v1');
  });

  it('points at any OpenAI-compatible endpoint', async () => {
    const env = await loadEnv({ AI_BASE_URL: 'http://vllm.internal:8000/v1' });

    expect(env.AI_BASE_URL).toBe('http://vllm.internal:8000/v1');
  });
});

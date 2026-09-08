import { describe, expect, it, vi } from 'vitest';

import { aiConfig } from './index';

const complete = {
  AI_API_KEY: 'sk-or-v1-key',
  AI_BASE_URL: 'http://vllm.internal:8000/v1',
  AI_MODEL: 'some/model',
};

describe('aiConfig', () => {
  it('is available only when all three variables are set', () => {
    expect(aiConfig(complete)).toEqual({
      available: true,
      config: { apiKey: 'sk-or-v1-key', baseURL: 'http://vllm.internal:8000/v1', modelId: 'some/model' },
    });
  });

  // Booting without an LLM is the point: a deployment that runs no AI nodes should
  // not need an LLM account, so this never throws.
  it('names every variable when nothing is set', () => {
    expect(aiConfig({})).toEqual({ available: false, missing: ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'] });
  });

  it.each([
    ['AI_API_KEY', ['AI_API_KEY']],
    ['AI_BASE_URL', ['AI_BASE_URL']],
    ['AI_MODEL', ['AI_MODEL']],
  ] as const)('names only the missing variable when %s is absent', (absent, missing) => {
    const env: NodeJS.ProcessEnv = { ...complete };
    delete env[absent];

    expect(aiConfig(env)).toEqual({ available: false, missing });
  });

  it('names two missing variables in declaration order', () => {
    expect(aiConfig({ AI_API_KEY: 'key' })).toEqual({ available: false, missing: ['AI_BASE_URL', 'AI_MODEL'] });
  });

  // compose passes absent optionals through as `${VAR:-}`, so '' must not count as configured
  it('treats an empty string like an unset variable', () => {
    expect(aiConfig({ ...complete, AI_MODEL: '' })).toEqual({ available: false, missing: ['AI_MODEL'] });
  });

  // The alias was dropped rather than scoped: a provider-named key that silently
  // applies to any AI_BASE_URL is a credential leak waiting to happen, and there are
  // no external deployments to keep working. Rename the variable in .env instead.
  it('does not read the retired OPENROUTER_API_KEY name', () => {
    expect(aiConfig({ ...complete, AI_API_KEY: '', OPENROUTER_API_KEY: 'old-key' })).toEqual({
      available: false,
      missing: ['AI_API_KEY'],
    });
  });

  it('reads process.env when no environment is given', () => {
    vi.stubEnv('AI_API_KEY', 'from-process-env');
    vi.stubEnv('AI_BASE_URL', complete.AI_BASE_URL);
    vi.stubEnv('AI_MODEL', complete.AI_MODEL);
    try {
      expect(aiConfig()).toMatchObject({ available: true, config: { apiKey: 'from-process-env' } });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

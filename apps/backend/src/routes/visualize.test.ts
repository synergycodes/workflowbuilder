import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AssertAuthorized, AuthVariables } from '../auth';
import type { TenantVariables } from '../tenant';

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock('../logger', () => ({
  logger: { child: () => ({ warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

const { createVisualizeRoutes } = await import('./visualize');

const AI_NAMES = ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL', 'OPENROUTER_API_KEY'];

function adapt(env: Record<string, string> = {}) {
  for (const name of AI_NAMES) {
    // undefined is Vitest's delete signal, and unstubAllEnvs restores the variable
    // eslint-disable-next-line unicorn/no-useless-undefined
    vi.stubEnv(name, undefined);
  }
  for (const [name, value] of Object.entries(env)) {
    vi.stubEnv(name, value);
  }

  const app = new Hono<{ Variables: AuthVariables & TenantVariables }>();
  app.route('/api/visualize', createVisualizeRoutes((async () => {}) as unknown as AssertAuthorized));

  return app.request('/api/visualize/adapt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'anything', format: 'text' }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  warn.mockClear();
});

describe('POST /api/visualize/adapt without an LLM', () => {
  it('answers 501', async () => {
    const response = await adapt();

    expect(response.status).toBe(501);
  });

  it('names a retired variable that is set, so an ignored key is not a silent 501', async () => {
    await adapt({ OPENROUTER_API_KEY: 'old-key' });

    expect(warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ missing: ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL'], retired: ['OPENROUTER_API_KEY'] }),
    );
  });

  it('reports no retired key when none is set', async () => {
    await adapt();

    expect(warn).toHaveBeenCalledWith(expect.any(String), expect.not.objectContaining({ retired: expect.anything() }));
  });
});

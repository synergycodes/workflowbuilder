import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { type RateLimitOptions, createRateLimitMiddleware } from './rate-limit';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build a Hono app mirroring the production wiring in `server.ts`: the
 * limiter guards a single execute-shaped route. Tests drive the clock through
 * the injectable `now` and identify callers via X-Forwarded-For (trustProxy),
 * since `app.request()` has no underlying socket.
 */
function makeApp(overrides: Partial<RateLimitOptions> = {}) {
  let timestamp = 0;
  const app = new Hono();
  app.use(
    '/api/workflows/:id/execute',
    createRateLimitMiddleware({
      perMinute: 2,
      perDay: 5,
      trustProxy: true,
      now: () => timestamp,
      ...overrides,
    }),
  );
  app.post('/api/workflows/:id/execute', (c) => c.json({ ok: true }, 202));

  return {
    app,
    advance(ms: number) {
      timestamp += ms;
    },
    execute(ip = '203.0.113.7') {
      return app.request('/api/workflows/wf-1/execute', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      });
    },
  };
}

describe('createRateLimitMiddleware', () => {
  it('allows requests under the limit', async () => {
    const { execute } = makeApp();

    const first = await execute();
    const second = await execute();
    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
  });

  it('rejects with 429 and Retry-After once the minute limit is hit', async () => {
    const { execute, advance } = makeApp();

    await execute();
    await execute();
    advance(10_000);

    const response = await execute();
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('50');
    expect(await response.json()).toMatchObject({ code: 'rate_limited', retryAfterSeconds: 50 });
  });

  it('tracks each IP independently', async () => {
    const { execute } = makeApp();

    await execute('203.0.113.7');
    await execute('203.0.113.7');
    const blocked = await execute('203.0.113.7');
    const otherIp = await execute('198.51.100.9');
    expect(blocked.status).toBe(429);
    expect(otherIp.status).toBe(202);
  });

  it('resets the minute window after it elapses', async () => {
    const { execute, advance } = makeApp();

    await execute();
    await execute();
    const blocked = await execute();
    expect(blocked.status).toBe(429);

    advance(MINUTE_MS);
    const allowedAgain = await execute();
    expect(allowedAgain.status).toBe(202);
  });

  it('enforces the day limit across minute windows', async () => {
    const { execute, advance } = makeApp();

    for (let index = 0; index < 5; index++) {
      const allowed = await execute();
      expect(allowed.status).toBe(202);
      advance(MINUTE_MS);
    }

    const response = await execute();
    expect(response.status).toBe(429);
    // 5 minutes into the day window -> retry once the remaining day elapses
    expect(response.headers.get('Retry-After')).toBe(String((DAY_MS - 5 * MINUTE_MS) / 1000));
  });

  it('resets the day window after it elapses', async () => {
    const { execute, advance } = makeApp({ perMinute: 0 });

    for (let index = 0; index < 5; index++) {
      await execute();
    }
    const blocked = await execute();
    expect(blocked.status).toBe(429);

    advance(DAY_MS);
    const allowedAgain = await execute();
    expect(allowedAgain.status).toBe(202);
  });

  it('uses the first X-Forwarded-For hop as the client identity', async () => {
    const { app } = makeApp();

    const request = (chain: string) =>
      app.request('/api/workflows/wf-1/execute', {
        method: 'POST',
        headers: { 'x-forwarded-for': chain },
      });

    await request('203.0.113.7, 10.0.0.1');
    await request('203.0.113.7, 10.0.0.2');
    const blocked = await request('203.0.113.7, 10.0.0.3');
    expect(blocked.status).toBe(429);
  });
});

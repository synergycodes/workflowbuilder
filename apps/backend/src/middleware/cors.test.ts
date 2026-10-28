import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { createCorsMiddleware } from './cors';

const STUDIO = 'https://studio.example.com';
const STRANGER = 'https://evil.example.com';

function makeApp(allowedOrigins: string[] | null) {
  const app = new Hono();
  app.use('/*', createCorsMiddleware(allowedOrigins));
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  return {
    get: (origin: string) => app.request('/api/health', { headers: { origin } }),
    preflight: (origin: string) =>
      app.request('/api/health', {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'POST' },
      }),
  };
}

describe('createCorsMiddleware', () => {
  it('answers any origin with a wildcard when no list is set', async () => {
    const { get } = makeApp(null);

    const response = await get(STRANGER);

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('answers no origin when the list is empty', async () => {
    const { get } = makeApp([]);

    const response = await get(STUDIO);

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('echoes a listed origin and names it as the vary key', async () => {
    const { get } = makeApp([STUDIO, 'http://localhost:4201']);

    const response = await get(STUDIO);

    expect(response.headers.get('access-control-allow-origin')).toBe(STUDIO);
    expect(response.headers.get('vary')).toContain('Origin');
  });

  it('leaves an unlisted origin without the header', async () => {
    const { get } = makeApp([STUDIO]);

    const response = await get(STRANGER);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('answers the preflight of a listed origin', async () => {
    const { preflight } = makeApp([STUDIO]);

    const response = await preflight(STUDIO);

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(STUDIO);
  });

  it('refuses the preflight of an unlisted origin', async () => {
    const { preflight } = makeApp([STUDIO]);

    const response = await preflight(STRANGER);

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import type { BackendEnv } from '../routes/backend-env';
import { refuseListing } from './listing-guard';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

// Stand-ins for the real routers, mounted the way server.ts mounts them: after the guard.
function makeApp() {
  const app = new Hono<BackendEnv>();
  refuseListing(app);
  const listed = vi.fn();
  for (const base of ['/api/workflows', '/api/executions']) {
    const routes = new Hono<BackendEnv>();
    routes.get('/', (c) => {
      listed(base);
      return c.json([]);
    });
    routes.post('/', (c) => c.json({ created: true }, 201));
    routes.get('/:id', (c) => c.json({ id: c.req.param('id') }));
    routes.get('/:id/stream', (c) => c.text('stream'));
    app.route(base, routes);
  }
  return { app, listed };
}

describe('refuseListing', () => {
  it.each(['/api/workflows', '/api/executions', '/api/executions?status=running&limit=1', '/api/workflows/'])(
    'refuses GET %s without reaching the list',
    async (path) => {
      const { app, listed } = makeApp();

      const response = await app.request(path);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(listed).not.toHaveBeenCalled();
    },
  );

  it('answers 403 listing_disabled', async () => {
    const { app } = makeApp();

    const response = await app.request('/api/executions');

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'listing_disabled' });
  });

  it.each([
    ['POST', '/api/workflows', 201],
    ['GET', `/api/workflows/${RUN}`, 200],
    ['GET', `/api/executions/${RUN}`, 200],
    ['GET', `/api/executions/${RUN}/stream`, 200],
  ])('lets %s %s through', async (method, path, status) => {
    const { app } = makeApp();

    const response = await app.request(path, { method });

    expect(response.status).toBe(status);
  });
});

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

// Import from the barrel (`./index`) rather than the source files so the
// test exercises the public surface a third-party adapter author would
// consume. This also pins that the barrel re-exports every type the
// adapter signature mentions — knip would flag drift otherwise.
import {
  type AuthAction,
  type AuthPort,
  type AuthResource,
  type AuthVariables,
  type CallerIdentity,
  createAuthMiddleware,
  makeAuthorize,
} from '.';

// ---- helpers ----------------------------------------------------------------

function makeApp(port: AuthPort): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use('*', createAuthMiddleware(port));
  const authorize = makeAuthorize(port);

  app.get('/widget/:id', async (c) => {
    const denied = await authorize(c, 'workflows:read', { kind: 'workflow', workflowId: c.req.param('id') });
    if (denied) return denied;
    return c.json({ id: c.req.param('id'), caller: c.var.caller });
  });

  return app;
}

function fakePort(overrides: Partial<AuthPort> = {}): AuthPort {
  return {
    identify: vi.fn(async () => null),
    authorize: vi.fn(async () => true),
    ...overrides,
  };
}

// ---- tests ------------------------------------------------------------------

describe('createAuthMiddleware + makeAuthorize', () => {
  it('authorize=true — handler proceeds and sees the caller on context', async () => {
    const caller: CallerIdentity = { subject: 'user-42', attributes: { roles: ['editor'] } };
    const port = fakePort({
      identify: vi.fn(async () => caller),
      authorize: vi.fn(async () => true),
    });

    const response = await makeApp(port).request('/widget/w-1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 'w-1', caller });
    expect(port.identify).toHaveBeenCalledTimes(1);
    expect(port.authorize).toHaveBeenCalledTimes(1);
  });

  it('caller null + authorize=false → 401 unauthenticated', async () => {
    const port = fakePort({
      identify: vi.fn(async () => null),
      authorize: vi.fn(async () => false),
    });

    const response = await makeApp(port).request('/widget/w-1');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'unauthenticated', message: 'Authentication required' });
  });

  it('caller present + authorize=false → 403 forbidden, message names the action', async () => {
    const port = fakePort({
      identify: vi.fn(async () => ({ subject: 'user-42' })),
      authorize: vi.fn(async () => false),
    });

    const response = await makeApp(port).request('/widget/w-1');

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'forbidden', message: 'Action workflows:read not permitted' });
  });

  it('caller is passed verbatim from identify into authorize', async () => {
    const caller: CallerIdentity = { subject: 'user-42', attributes: { tenant: 'acme' } };
    const port = fakePort({
      identify: vi.fn(async () => caller),
      authorize: vi.fn(async () => true),
    });

    await makeApp(port).request('/widget/w-1');

    const expectedResource: AuthResource = { kind: 'workflow', workflowId: 'w-1' };
    expect(port.authorize).toHaveBeenCalledWith(caller, 'workflows:read', expectedResource);
  });

  it('exception from authorize propagates — not silently treated as allow or deny', async () => {
    const port = fakePort({
      identify: vi.fn(async () => null),
      authorize: vi.fn(async () => {
        throw new Error('IdP unreachable');
      }),
    });

    // Hono surfaces uncaught errors as 500 by default. The pin is: the request
    // does NOT slip through with 200 and does NOT get coerced into 401/403.
    const response = await makeApp(port).request('/widget/w-1');
    expect(response.status).toBe(500);
  });

  it('identify runs once per request even with multiple authorize calls in one handler', async () => {
    const port = fakePort({
      identify: vi.fn(async () => ({ subject: 'user-42' })),
      authorize: vi.fn(async () => true),
    });
    const authorize = makeAuthorize(port);

    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.get('/dual', async (c) => {
      const a = await authorize(c, 'workflows:read', { kind: 'workflows' });
      if (a) return a;
      const b = await authorize(c, 'workflows:list', { kind: 'workflows' });
      if (b) return b;
      return c.json({ ok: true });
    });

    const response = await app.request('/dual');
    expect(response.status).toBe(200);
    expect(port.identify).toHaveBeenCalledTimes(1);
    expect(port.authorize).toHaveBeenCalledTimes(2);
  });
});

describe('makeAuthorize — port binding', () => {
  it('binds the port at factory time — same authorize fn used across requests', async () => {
    const port = fakePort({
      identify: vi.fn(async () => ({ subject: 'user-1' })),
      authorize: vi.fn(async (_caller, action: AuthAction) => action === 'workflows:read'),
    });
    const authorize = makeAuthorize(port);

    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.get('/r', async (c) => {
      const denied = await authorize(c, 'workflows:read', { kind: 'workflows' });
      if (denied) return denied;
      return c.json({ ok: true });
    });
    app.get('/w', async (c) => {
      const denied = await authorize(c, 'workflows:create', { kind: 'workflows' });
      if (denied) return denied;
      return c.json({ ok: true });
    });

    const readResponse = await app.request('/r');
    const writeResponse = await app.request('/w');

    expect(readResponse.status).toBe(200);
    expect(writeResponse.status).toBe(403);
  });
});

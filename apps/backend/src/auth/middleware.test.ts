import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

// Import from the barrel (`./index`) rather than the source files so the
// test exercises the public surface a third-party adapter author would
// consume. This also pins that the barrel re-exports every type the
// adapter signature mentions - knip would flag drift otherwise.
import {
  type AuthAction,
  AuthDeniedError,
  type AuthPort,
  type AuthResource,
  type AuthVariables,
  type CallerIdentity,
  createAuthMiddleware,
  makeAssertAuthorized,
} from '.';

// ---- helpers ----------------------------------------------------------------

/**
 * Build a Hono app that mirrors the production wiring in `server.ts`:
 * middleware identifies the caller, handlers call `assertAuthorized`, and
 * `app.onError` maps `AuthDeniedError` to 401 / 403. The tests below assert
 * against the full denied-request flow, not just the assertion function in
 * isolation - that pins the contract a route author actually sees.
 */
function makeApp(port: AuthPort): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use('*', createAuthMiddleware(port));
  app.onError((error, c) => {
    if (error instanceof AuthDeniedError) {
      if (!error.caller) {
        return c.json({ code: 'unauthenticated', message: 'Authentication required' }, 401);
      }
      return c.json({ code: 'forbidden', message: error.message }, 403);
    }
    return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
  });
  const assertAuthorized = makeAssertAuthorized(port);

  app.get('/widget/:id', async (c) => {
    await assertAuthorized(c, 'workflows:read', { kind: 'workflow', workflowId: c.req.param('id') });
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

describe('createAuthMiddleware + makeAssertAuthorized', () => {
  it('authorize=true: handler proceeds and sees the caller on context', async () => {
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

  it('caller null + authorize=false: 401 unauthenticated via onError mapper', async () => {
    const port = fakePort({
      identify: vi.fn(async () => null),
      authorize: vi.fn(async () => false),
    });

    const response = await makeApp(port).request('/widget/w-1');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: 'unauthenticated', message: 'Authentication required' });
  });

  it('caller present + authorize=false: 403 forbidden, message names the action', async () => {
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

  it('on deny the handler body never reaches the wire', async () => {
    // Throw-based shape removes the `if (denied) return denied` footgun: a
    // handler that calls assertAuthorized cannot accidentally let the next
    // line run. Pin: a 403 / 401 response never carries the success body
    // the handler would have built.
    const port = fakePort({
      identify: vi.fn(async () => null),
      authorize: vi.fn(async () => false),
    });
    const assertAuthorized = makeAssertAuthorized(port);

    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.onError((error, c) => {
      if (error instanceof AuthDeniedError) {
        return c.json({ code: 'unauthenticated', message: 'Authentication required' }, 401);
      }
      return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
    });
    app.get('/sensitive', async (c) => {
      await assertAuthorized(c, 'workflows:read', { kind: 'workflows' });
      return c.json({ leaked: true });
    });

    const response = await app.request('/sensitive');
    expect(response.status).toBe(401);
    expect(await response.json()).not.toMatchObject({ leaked: true });
  });

  it('exception from authorize propagates: not silently treated as allow or deny', async () => {
    const port = fakePort({
      identify: vi.fn(async () => null),
      authorize: vi.fn(async () => {
        throw new Error('IdP unreachable');
      }),
    });

    // Hono surfaces uncaught non-AuthDeniedError exceptions as 500 by default.
    // The pin is: the request does NOT slip through with 200 and does NOT get
    // coerced into 401/403 (which would mask infrastructure outages as
    // anonymous traffic).
    const response = await makeApp(port).request('/widget/w-1');
    expect(response.status).toBe(500);
  });

  it('identify runs once per request even with multiple assertAuthorized calls in one handler', async () => {
    const port = fakePort({
      identify: vi.fn(async () => ({ subject: 'user-42' })),
      authorize: vi.fn(async () => true),
    });
    const assertAuthorized = makeAssertAuthorized(port);

    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.get('/dual', async (c) => {
      await assertAuthorized(c, 'workflows:read', { kind: 'workflows' });
      await assertAuthorized(c, 'workflows:list', { kind: 'workflows' });
      return c.json({ ok: true });
    });

    const response = await app.request('/dual');
    expect(response.status).toBe(200);
    expect(port.identify).toHaveBeenCalledTimes(1);
    expect(port.authorize).toHaveBeenCalledTimes(2);
  });
});

describe('makeAssertAuthorized: port binding', () => {
  it('binds the port at factory time: same assertion fn used across requests', async () => {
    const port = fakePort({
      identify: vi.fn(async () => ({ subject: 'user-1' })),
      authorize: vi.fn(async (_caller, action: AuthAction) => action === 'workflows:read'),
    });
    const assertAuthorized = makeAssertAuthorized(port);

    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.onError((error, c) => {
      if (error instanceof AuthDeniedError) {
        return c.json({ code: 'forbidden', message: error.message }, 403);
      }
      return c.json({ code: 'internal_error', message: 'Internal server error' }, 500);
    });
    app.get('/r', async (c) => {
      await assertAuthorized(c, 'workflows:read', { kind: 'workflows' });
      return c.json({ ok: true });
    });
    app.get('/w', async (c) => {
      await assertAuthorized(c, 'workflows:create', { kind: 'workflows' });
      return c.json({ ok: true });
    });

    const readResponse = await app.request('/r');
    const writeResponse = await app.request('/w');

    expect(readResponse.status).toBe(200);
    expect(writeResponse.status).toBe(403);
  });
});

describe('AuthDeniedError', () => {
  it('carries caller, action, and resource so onError handlers can log the denial', async () => {
    const caller: CallerIdentity = { subject: 'user-42' };
    const resource: AuthResource = { kind: 'workflow', workflowId: 'w-1' };
    const port = fakePort({
      identify: vi.fn(async () => caller),
      authorize: vi.fn(async () => false),
    });
    const assertAuthorized = makeAssertAuthorized(port);

    let captured: unknown;
    const app = new Hono<{ Variables: AuthVariables }>();
    app.use('*', createAuthMiddleware(port));
    app.onError((error, c) => {
      captured = error;
      return c.json({}, 403);
    });
    app.get('/x', async (c) => {
      await assertAuthorized(c, 'workflows:read', resource);
      return c.json({ ok: true });
    });

    await app.request('/x');

    expect(captured).toBeInstanceOf(AuthDeniedError);
    const denied = captured as AuthDeniedError;
    expect(denied.caller).toEqual(caller);
    expect(denied.action).toBe('workflows:read');
    expect(denied.resource).toEqual(resource);
  });
});

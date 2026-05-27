import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AuthAction,
  AuthDeniedError,
  type AuthPort,
  type AuthResource,
  type AuthVariables,
  createAuthMiddleware,
  makeAssertAuthorized,
} from '../auth';
import { createWorkflowsRoutes } from './workflows';

// ---- module mocks -----------------------------------------------------------
//
// Tests in this file exist to pin one thing: every route in
// `createWorkflowsRoutes` calls `assertAuthorized` with the correct action +
// resource shape, *before* touching the database, and a deny response stops
// the request without any DB work. They are not integration tests for the DB
// itself - those would need a real Postgres - so the database client is
// stubbed with a chainable proxy that returns whatever the test programs it
// to return.

const { databaseMock, getEngineMock, engineMock } = vi.hoisted(() => {
  return {
    databaseMock: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    engineMock: {
      submit: vi.fn(),
      cancel: vi.fn(),
    },
    getEngineMock: vi.fn(),
  };
});

vi.mock('../db/client', () => ({ database: databaseMock }));
vi.mock('../engine', () => ({ getWorkflowEngine: getEngineMock }));

// ---- helpers ----------------------------------------------------------------

/**
 * Build a chainable proxy that resolves to `value` when awaited and returns
 * itself for any method call. Drizzle queries are thenable chains
 * (`db.select().from(t).where(...).returning()` etc.), and the test only
 * cares about the awaited result, not the chain structure.
 */
function chainProxyHandler<T>(value: T): ProxyHandler<Promise<T>> {
  return {
    get(target, property, receiver) {
      if (property === 'then' || property === 'catch' || property === 'finally') {
        const v = Reflect.get(target, property, receiver);
        return typeof v === 'function' ? v.bind(target) : v;
      }
      return () => chainResolving(value);
    },
  };
}

function chainResolving<T>(value: T): Promise<T> {
  return new Proxy(Promise.resolve(value), chainProxyHandler(value));
}

function buildApp(port: AuthPort) {
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
  app.route('/api/workflows', createWorkflowsRoutes(makeAssertAuthorized(port)));
  return app;
}

function allowAll(spy: ReturnType<typeof vi.fn>): AuthPort {
  return {
    identify: vi.fn(async () => null),
    authorize: spy,
  };
}

function denyAll(): AuthPort {
  return {
    identify: vi.fn(async () => null),
    authorize: vi.fn(async () => false),
  };
}

const fakeWorkflow = {
  id: 'w-1',
  name: 'demo',
  draftJson: { nodes: [], edges: [] },
  publishedJson: null,
  publishedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

beforeEach(() => {
  vi.clearAllMocks();
  getEngineMock.mockReturnValue(engineMock);
});

// ---- per-route authorization pins ------------------------------------------

describe('createWorkflowsRoutes - authorize is called with the right shape per route', () => {
  it.each<{ method: string; path: string; body?: unknown; action: AuthAction; resource: AuthResource }>([
    {
      method: 'POST',
      path: '/api/workflows',
      body: { name: 'new' },
      action: 'workflows:create',
      resource: { kind: 'workflows' },
    },
    {
      method: 'GET',
      path: '/api/workflows',
      action: 'workflows:list',
      resource: { kind: 'workflows' },
    },
    {
      method: 'GET',
      path: '/api/workflows/w-1',
      action: 'workflows:read',
      resource: { kind: 'workflow', workflowId: 'w-1' },
    },
    {
      method: 'PATCH',
      path: '/api/workflows/w-1/draft',
      body: { draftJson: { nodes: [], edges: [] } },
      action: 'workflows:update',
      resource: { kind: 'workflow', workflowId: 'w-1' },
    },
    {
      method: 'POST',
      path: '/api/workflows/w-1/publish',
      action: 'workflows:publish',
      resource: { kind: 'workflow', workflowId: 'w-1' },
    },
    {
      method: 'POST',
      path: '/api/workflows/w-1/execute',
      body: { sourceVersion: 'draft' },
      action: 'workflows:execute',
      resource: { kind: 'workflow', workflowId: 'w-1' },
    },
  ])('$method $path -> assertAuthorized($action, $resource)', async ({ method, path, body, action, resource }) => {
    // Allow everything so the test can observe the call shape, then stub the
    // DB chain so the handler doesn't blow up after the auth check.
    const authorizeSpy = vi.fn(async () => true);
    const port = allowAll(authorizeSpy);
    const app = buildApp(port);

    databaseMock.select.mockReturnValue(chainResolving([fakeWorkflow]));
    databaseMock.insert.mockReturnValue(chainResolving([fakeWorkflow]));
    databaseMock.update.mockReturnValue(chainResolving([fakeWorkflow]));

    // For execute, the draftJson needs to be a valid snapshot or Zod rejects
    // before submit is called. The fixture above already satisfies that.

    await app.request(path, {
      method,
      ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
    });

    expect(authorizeSpy).toHaveBeenCalledWith(null, action, resource);
  });
});

// ---- deny path: no DB work, response is 401 --------------------------------

describe('createWorkflowsRoutes - deny short-circuits before any DB access', () => {
  const cases: Array<{ method: string; path: string; body?: unknown }> = [
    { method: 'POST', path: '/api/workflows', body: { name: 'x' } },
    { method: 'GET', path: '/api/workflows' },
    { method: 'GET', path: '/api/workflows/w-1' },
    { method: 'PATCH', path: '/api/workflows/w-1/draft', body: { draftJson: {} } },
    { method: 'POST', path: '/api/workflows/w-1/publish' },
    { method: 'POST', path: '/api/workflows/w-1/execute', body: { sourceVersion: 'draft' } },
  ];

  it.each(cases)('$method $path -> 401 and DB untouched', async ({ method, path, body }) => {
    const app = buildApp(denyAll());

    const response = await app.request(path, {
      method,
      ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
    });

    expect(response.status).toBe(401);
    expect(databaseMock.select).not.toHaveBeenCalled();
    expect(databaseMock.insert).not.toHaveBeenCalled();
    expect(databaseMock.update).not.toHaveBeenCalled();
    expect(engineMock.submit).not.toHaveBeenCalled();
    expect(engineMock.cancel).not.toHaveBeenCalled();
  });
});

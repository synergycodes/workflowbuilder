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
import { type TenantContext, type TenantVariables, createTenantMiddleware } from '../tenant';
import { createExecutionsRoutes } from './executions';

// ---- module mocks -----------------------------------------------------------
//
// Same intent as workflows.test.ts: pin that every route in
// `createExecutionsRoutes` calls `assertAuthorized` with the correct action
// and resource before touching the database, and a deny stops the request
// without DB work or engine calls. The execution event bus is also stubbed
// because importing the routes pulls in a postgres LISTEN setup we do not
// want to spin up in unit tests.

const { databaseMock, getEngineMock, engineMock, subscribeMock } = vi.hoisted(() => {
  return {
    databaseMock: {
      select: vi.fn(),
      update: vi.fn(),
    },
    engineMock: {
      submit: vi.fn(),
      cancel: vi.fn(),
    },
    getEngineMock: vi.fn(),
    subscribeMock: vi.fn<() => Promise<() => void>>(),
  };
});

vi.mock('../db/client', () => ({ database: databaseMock }));
vi.mock('../engine', () => ({ getWorkflowEngine: getEngineMock }));
vi.mock('../events/execution-event-bus', () => ({ subscribe: subscribeMock }));

// ---- helpers ----------------------------------------------------------------

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
  app.route('/api/executions', createExecutionsRoutes(makeAssertAuthorized(port)));
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

// Same wiring as buildApp, plus the tenant middleware so the route's tenant
// cross-check has a `c.var.tenant` to read. `tenant` is what the configured
// TenantContextPort resolves to (null = single-tenant reference default).
function buildAppWithTenant(port: AuthPort, tenant: TenantContext | null) {
  const app = new Hono<{ Variables: AuthVariables & TenantVariables }>();
  app.use('*', createAuthMiddleware(port));
  app.use('*', createTenantMiddleware({ resolve: vi.fn(async () => tenant) }));
  app.route('/api/executions', createExecutionsRoutes(makeAssertAuthorized(port)));
  return app;
}

// Terminal status so the SSE handler returns after the snapshot and the test
// does not have to chase a long-lived stream connection.
const terminalExecution = {
  id: 'e-1',
  workflowId: 'w-1',
  sourceVersion: 'draft',
  status: 'completed',
  startedAt: null,
  finishedAt: new Date(0),
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const pendingExecution = { ...terminalExecution, status: 'pending', finishedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  getEngineMock.mockReturnValue(engineMock);
});

// ---- per-route authorization pins ------------------------------------------

describe('createExecutionsRoutes - authorize is called with the right shape per route', () => {
  it.each<{ method: string; path: string; action: AuthAction; resource: AuthResource; execution: unknown }>([
    {
      method: 'GET',
      path: '/api/executions/e-1',
      action: 'executions:read',
      resource: { kind: 'execution', executionId: 'e-1' },
      execution: terminalExecution,
    },
    {
      method: 'DELETE',
      path: '/api/executions/e-1',
      action: 'executions:cancel',
      resource: { kind: 'execution', executionId: 'e-1' },
      execution: pendingExecution,
    },
  ])('$method $path -> assertAuthorized($action, $resource)', async ({ method, path, action, resource, execution }) => {
    const authorizeSpy = vi.fn(async () => true);
    const port = allowAll(authorizeSpy);
    const app = buildApp(port);

    databaseMock.select.mockReturnValue(chainResolving([execution]));
    databaseMock.update.mockReturnValue(chainResolving([]));

    await app.request(path, { method });

    expect(authorizeSpy).toHaveBeenCalledWith(null, action, resource);
  });

  // Stream handler runs two distinct selects (executions row, then events
  // table) so the mock has to return different values per call. Kept as its
  // own test to avoid contorting the parameterized setup above.
  it('GET /api/executions/:id/stream -> assertAuthorized(executions:stream, ...)', async () => {
    const authorizeSpy = vi.fn(async () => true);
    const port = allowAll(authorizeSpy);
    const app = buildApp(port);

    // 1st select: the executions row. 2nd select: the events catch-up query.
    // Terminal status short-circuits streamSSE after the snapshot so the test
    // does not hold a long-lived stream connection open.
    databaseMock.select.mockReturnValueOnce(chainResolving([terminalExecution]));
    databaseMock.select.mockReturnValue(chainResolving([]));

    await app.request('/api/executions/e-1/stream', { method: 'GET' });

    expect(authorizeSpy).toHaveBeenCalledWith(null, 'executions:stream', {
      kind: 'execution',
      executionId: 'e-1',
    });
    // Subscribe is only wired for non-terminal executions; pin that the
    // terminal short-circuit holds so the test does not pay for a postgres
    // LISTEN setup it never needs.
    expect(subscribeMock).not.toHaveBeenCalled();
  });
});

// ---- deny path: no DB or engine work --------------------------------------

describe('createExecutionsRoutes - deny short-circuits before DB or engine work', () => {
  const cases: Array<{ method: string; path: string }> = [
    { method: 'GET', path: '/api/executions/e-1' },
    { method: 'GET', path: '/api/executions/e-1/stream' },
    { method: 'DELETE', path: '/api/executions/e-1' },
  ];

  it.each(cases)('$method $path -> 401 and DB/engine untouched', async ({ method, path }) => {
    const app = buildApp(denyAll());

    const response = await app.request(path, { method });

    expect(response.status).toBe(401);
    expect(databaseMock.select).not.toHaveBeenCalled();
    expect(databaseMock.update).not.toHaveBeenCalled();
    expect(engineMock.submit).not.toHaveBeenCalled();
    expect(engineMock.cancel).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
  });
});

// ---- tenant cross-check on the SSE stream ----------------------------------
//
// The stream is the one execution-row endpoint that enforces tenant isolation
// directly, as defence-in-depth for EventSource's weaker auth (it cannot send
// an Authorization header). Resource-level scoping of GET/:id and DELETE/:id
// is the AuthPort's job - see tenant-context-port.decision-log.md. The check
// is a no-op when either side is null, which keeps the single-tenant reference
// (NoopTenantContextPort resolves null) behaving exactly as before.

const tenantedExecution = { ...terminalExecution, tenantId: 'acme' };

const allowStream = () => allowAll(vi.fn(async () => true));

function programStream(execution: unknown) {
  // 1st select: the executions row. 2nd: the events catch-up query.
  databaseMock.select.mockReturnValueOnce(chainResolving([execution]));
  databaseMock.select.mockReturnValue(chainResolving([]));
}

describe('createExecutionsRoutes - stream tenant cross-check', () => {
  it('404 (not 403) when caller tenant differs - no cross-tenant existence leak', async () => {
    const app = buildAppWithTenant(allowStream(), { tenantId: 'other' });
    programStream(tenantedExecution);

    const response = await app.request('/api/executions/e-1/stream');

    // Byte-identical to the not-found branch: a foreign execution must be
    // indistinguishable from one that does not exist, or the id is enumerable.
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'execution_not_found', message: 'Execution not found' });
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('streams when caller tenant matches the execution tenant', async () => {
    const app = buildAppWithTenant(allowStream(), { tenantId: 'acme' });
    programStream(tenantedExecution);

    const response = await app.request('/api/executions/e-1/stream');

    expect(response.status).toBe(200);
  });

  it('no-op when caller has no tenant - single-tenant default - even if the execution is tenanted', async () => {
    const app = buildAppWithTenant(allowStream(), null);
    programStream(tenantedExecution);

    const response = await app.request('/api/executions/e-1/stream');

    expect(response.status).toBe(200);
  });

  it('no-op when the execution has no tenant even if the caller is tenanted', async () => {
    const app = buildAppWithTenant(allowStream(), { tenantId: 'acme' });
    programStream(terminalExecution); // terminalExecution carries no tenantId

    const response = await app.request('/api/executions/e-1/stream');

    expect(response.status).toBe(200);
  });
});

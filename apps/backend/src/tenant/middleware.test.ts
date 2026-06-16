import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

// Import via the barrel — same path a third-party adapter author would use.
import {
  type TenantContext,
  type TenantContextPort,
  type TenantVariables,
  createTenantMiddleware,
  requireTenant,
} from '.';

function fakePort(overrides: Partial<TenantContextPort> = {}): TenantContextPort {
  return {
    resolve: vi.fn(async () => null),
    ...overrides,
  };
}

function makeApp(port: TenantContextPort): Hono<{ Variables: TenantVariables }> {
  const app = new Hono<{ Variables: TenantVariables }>();
  app.use('*', createTenantMiddleware(port));

  app.get('/probe', (c) => c.json({ tenant: c.var.tenant }));

  app.get('/scoped/:id', (c) => {
    const tenant = requireTenant(c);
    if (tenant instanceof Response) return tenant;
    return c.json({ id: c.req.param('id'), tenantId: tenant.tenantId });
  });

  return app;
}

describe('createTenantMiddleware', () => {
  it('stashes the resolved tenant on the request context', async () => {
    const tenant: TenantContext = { tenantId: 'acme' };
    const port = fakePort({ resolve: vi.fn(async () => tenant) });

    const response = await makeApp(port).request('/probe');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tenant });
    expect(port.resolve).toHaveBeenCalledTimes(1);
  });

  it('stashes null when the port returns null — single-tenant default', async () => {
    const port = fakePort({ resolve: vi.fn(async () => null) });

    const response = await makeApp(port).request('/probe');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tenant: null });
  });

  it('forwards the raw Request object to the port — adapter sees full url + headers', async () => {
    const seen: Request[] = [];
    const port = fakePort({
      resolve: vi.fn(async (request: Request) => {
        seen.push(request);
        return null;
      }),
    });

    await makeApp(port).request('/probe', { headers: { 'x-tenant-id': 'beta' } });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.headers.get('x-tenant-id')).toBe('beta');
  });

  it('resolves exactly once per request even with multiple handlers downstream', async () => {
    const port = fakePort({ resolve: vi.fn(async () => ({ tenantId: 'acme' })) });

    const app = new Hono<{ Variables: TenantVariables }>();
    app.use('*', createTenantMiddleware(port));
    app.get('/multi', async (c) => {
      const a = c.var.tenant;
      const b = c.var.tenant;
      return c.json({ same: a === b, tenantId: a?.tenantId });
    });

    const response = await app.request('/multi');

    expect(await response.json()).toEqual({ same: true, tenantId: 'acme' });
    expect(port.resolve).toHaveBeenCalledTimes(1);
  });

  it('propagates an exception from the port — not silently coerced to null', async () => {
    // Throw is reserved for unexpected failures (tenant store down, DNS timeout).
    // Routes must NOT treat that as anonymous; Hono surfaces it as 500.
    const port = fakePort({
      resolve: vi.fn(async () => {
        throw new Error('tenant store unreachable');
      }),
    });

    const response = await makeApp(port).request('/probe');
    expect(response.status).toBe(500);
  });
});

describe('requireTenant', () => {
  it('returns the resolved TenantContext when present', async () => {
    const port = fakePort({ resolve: vi.fn(async () => ({ tenantId: 'acme' })) });

    const response = await makeApp(port).request('/scoped/widget-1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: 'widget-1', tenantId: 'acme' });
  });

  it('returns a 400 Response when no tenant is on the context', async () => {
    const port = fakePort({ resolve: vi.fn(async () => null) });

    const response = await makeApp(port).request('/scoped/widget-1');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: 'tenant_required', message: 'Tenant context required' });
  });
});

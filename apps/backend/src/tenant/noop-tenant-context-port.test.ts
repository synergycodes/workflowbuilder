import { describe, expect, it } from 'vitest';

// Imported via the barrel — the same path a third-party adapter author would
// use. Pins that the public surface re-exports both the no-op impl and the
// interface in one place; knip flags if either drifts out of the barrel.
import { NoopTenantContextPort, type TenantContextPort } from '.';

describe('NoopTenantContextPort', () => {
  // Typed as the interface so the test exercises the contract callers see
  // rather than the impl's narrowed signature.
  const port: TenantContextPort = new NoopTenantContextPort();

  it('resolves to null — the reference backend is single-tenant', async () => {
    const request = new Request('http://localhost/api/workflows');
    await expect(port.resolve(request)).resolves.toBeNull();
  });

  it('does not throw for any request shape — tenancy is an opt-in seam', async () => {
    // Subdomain hint, header hint, POST without body — none of these should
    // make the no-op resolver care. Real adapters interpret one of them.
    const requests = [
      new Request('http://localhost/'),
      new Request('http://acme.example.com/api/x', { headers: { 'x-tenant-id': 'acme' } }),
      new Request('http://localhost/api/health', { method: 'POST' }),
      new Request('http://localhost/api/y', {
        headers: { authorization: 'Bearer eyJhbGc...' },
      }),
    ];

    for (const request of requests) {
      await expect(port.resolve(request)).resolves.toBeNull();
    }
  });
});

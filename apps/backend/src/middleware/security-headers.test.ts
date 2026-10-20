import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { type SecurityHeadersOptions, createSecurityHeadersMiddleware } from './security-headers';

const PROXIED: SecurityHeadersOptions = { behindTlsProxy: true };

async function headersOf(options: SecurityHeadersOptions, path = '/api/health') {
  const app = new Hono();
  app.use('/*', createSecurityHeadersMiddleware(options));
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.get('/api/boom', () => {
    throw new Error('boom');
  });
  app.onError((_error, c) => c.json({ code: 'internal_error' }, 500));
  const response = await app.request(path);
  return response.headers;
}

describe('createSecurityHeadersMiddleware', () => {
  it('forbids the API from loading or being framed by anything', async () => {
    const headers = await headersOf(PROXIED);

    expect(headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(headers.get('x-frame-options')).toBe('DENY');
  });

  it('sets the headers a scanner grades on', async () => {
    const headers = await headersOf(PROXIED);

    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('sends HSTS behind a TLS-terminating proxy', async () => {
    const headers = await headersOf({ behindTlsProxy: true });

    expect(headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
  });

  // A dev backend reached once over a local TLS proxy would otherwise pin HSTS on localhost for a year.
  it('sends no HSTS when nothing terminates TLS in front', async () => {
    const headers = await headersOf({ behindTlsProxy: false });

    expect(headers.get('strict-transport-security')).toBeNull();
  });

  it('keeps the headers on an error response', async () => {
    const headers = await headersOf(PROXIED, '/api/boom');

    expect(headers.get('x-content-type-options')).toBe('nosniff');
  });
});

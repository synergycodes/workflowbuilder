import type { MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';

export interface SecurityHeadersOptions {
  behindTlsProxy: boolean;
}

// The API serves JSON and an event stream, never a page, so nothing may load or frame it.
export function createSecurityHeadersMiddleware({ behindTlsProxy }: SecurityHeadersOptions): MiddlewareHandler {
  return secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    xFrameOptions: 'DENY',
    // Only where a proxy terminates TLS in front: a dev backend reached once over a local
    // TLS proxy would otherwise pin HSTS on localhost for a year.
    strictTransportSecurity: behindTlsProxy ? 'max-age=31536000; includeSubDomains' : false,
  });
}

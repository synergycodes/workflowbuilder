// Mirrors apps/backend/src/engine/temporal-connection.test.ts. The builder is
// duplicated per app (see the note in temporal-connection.ts), so the tests are too —
// that is what catches the copies drifting apart.
import { describe, expect, it, vi } from 'vitest';

import { type TemporalConnectionConfig, buildTemporalConnectionOptions } from './temporal-connection';

const empty: TemporalConnectionConfig = { tls: null, apiKey: null, caPath: null, certPath: null, keyPath: null };

function config(overrides: Partial<TemporalConnectionConfig>): TemporalConnectionConfig {
  return { ...empty, ...overrides };
}

// Keyed by path so a test can tell the CA apart from the client cert.
function fakeReader() {
  return vi.fn((path: string) => new TextEncoder().encode(`contents-of:${path}`));
}

function bytes(path: string) {
  return new TextEncoder().encode(`contents-of:${path}`);
}

describe('buildTemporalConnectionOptions', () => {
  it('stays plaintext when nothing is configured — the local-dev default', () => {
    expect(buildTemporalConnectionOptions(empty, fakeReader())).toEqual({});
  });

  it('enables TLS with the OS trust store on TEMPORAL_TLS=true', () => {
    expect(buildTemporalConnectionOptions(config({ tls: 'true' }), fakeReader())).toEqual({ tls: true });
  });

  it('stays plaintext on an explicit TEMPORAL_TLS=false', () => {
    expect(buildTemporalConnectionOptions(config({ tls: 'false' }), fakeReader())).toEqual({});
  });

  // Mirrors the SDK's own normalizeTlsConfig, which turns TLS on whenever an
  // apiKey is present. Temporal Cloud rejects an API key sent in the clear.
  it('infers TLS from an API key alone', () => {
    expect(buildTemporalConnectionOptions(config({ apiKey: 'tmprl-key' }), fakeReader())).toEqual({
      tls: true,
      apiKey: 'tmprl-key',
    });
  });

  it('loads a private CA certificate', () => {
    const read = fakeReader();

    expect(buildTemporalConnectionOptions(config({ caPath: '/certs/ca.pem' }), read)).toEqual({
      tls: { serverRootCACertificate: bytes('/certs/ca.pem') },
    });
    expect(read).toHaveBeenCalledWith('/certs/ca.pem');
  });

  it('loads a full mTLS pair alongside the CA', () => {
    const options = buildTemporalConnectionOptions(
      config({ caPath: '/certs/ca.pem', certPath: '/certs/client.pem', keyPath: '/certs/client.key' }),
      fakeReader(),
    );

    expect(options).toEqual({
      tls: {
        serverRootCACertificate: bytes('/certs/ca.pem'),
        clientCertPair: { crt: bytes('/certs/client.pem'), key: bytes('/certs/client.key') },
      },
    });
  });
});

describe('buildTemporalConnectionOptions rejects contradictory config at connect time', () => {
  it('refuses half an mTLS pair', () => {
    expect(() => buildTemporalConnectionOptions(config({ certPath: '/certs/client.pem' }), fakeReader())).toThrow(
      /must be set together/,
    );
    expect(() => buildTemporalConnectionOptions(config({ keyPath: '/certs/client.key' }), fakeReader())).toThrow(
      /must be set together/,
    );
  });

  it('refuses an API key and a client certificate together', () => {
    const both = config({ apiKey: 'k', certPath: '/certs/client.pem', keyPath: '/certs/client.key' });

    expect(() => buildTemporalConnectionOptions(both, fakeReader())).toThrow(/not both/);
  });

  it('refuses credentials that TEMPORAL_TLS=false would silently discard', () => {
    const contradiction = config({ tls: 'false', apiKey: 'k' });

    expect(() => buildTemporalConnectionOptions(contradiction, fakeReader())).toThrow(/contradicts/);
  });

  it('refuses a TEMPORAL_TLS value that is neither true nor false', () => {
    expect(() => buildTemporalConnectionOptions(config({ tls: 'yes' }), fakeReader())).toThrow(/must be 'true'/);
  });

  it('names the variable and the path when a certificate cannot be read', () => {
    const explode = vi.fn(() => {
      throw new Error('ENOENT');
    });

    expect(() => buildTemporalConnectionOptions(config({ caPath: '/nope.pem' }), explode)).toThrow(
      /TEMPORAL_TLS_CA_PATH \(\/nope\.pem\)/,
    );
  });
});

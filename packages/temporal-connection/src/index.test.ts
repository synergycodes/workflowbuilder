import { describe, expect, it, vi } from 'vitest';

import { temporalConfig } from './index';

// Keyed by path so a test can tell the CA apart from the client cert.
function fakeReader() {
  return vi.fn((path: string) => new TextEncoder().encode(`contents-of:${path}`));
}

function bytes(path: string) {
  return new TextEncoder().encode(`contents-of:${path}`);
}

const ADDRESS = 'temporal.example:7233';

// TLS / API-key cases are about everything but the address, so they pin it.
function tlsOptions(env: NodeJS.ProcessEnv, readFile = fakeReader()) {
  return temporalConfig({ TEMPORAL_ADDRESS: ADDRESS, ...env }, readFile).connection;
}

describe('temporalConfig', () => {
  it('defaults to the local docker stack on the default namespace', () => {
    expect(temporalConfig({}, fakeReader())).toEqual({
      connection: { address: '127.0.0.1:7233' },
      namespace: 'default',
    });
  });

  it('reads the address and namespace', () => {
    const env = { TEMPORAL_ADDRESS: 'ns.acct.tmprl.cloud:7233', TEMPORAL_NAMESPACE: 'ns.acct' };

    expect(temporalConfig(env, fakeReader())).toEqual({
      connection: { address: 'ns.acct.tmprl.cloud:7233' },
      namespace: 'ns.acct',
    });
  });

  it('reads process.env when no environment is given', () => {
    vi.stubEnv('TEMPORAL_NAMESPACE', 'from-process-env');
    try {
      expect(temporalConfig().namespace).toBe('from-process-env');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('temporalConfig().connection TLS', () => {
  it('stays plaintext when nothing is configured — the local-dev default', () => {
    expect(tlsOptions({})).toEqual({ address: ADDRESS });
  });

  // compose passes absent optionals through as `${VAR:-}`, so '' must not count as configured
  it('treats an empty string like an unset variable', () => {
    const env = { TEMPORAL_TLS: '', TEMPORAL_API_KEY: '', TEMPORAL_TLS_CA_PATH: '' };

    expect(tlsOptions(env)).toEqual({ address: ADDRESS });
  });

  it('enables TLS with the OS trust store on TEMPORAL_TLS=true', () => {
    expect(tlsOptions({ TEMPORAL_TLS: 'true' })).toEqual({ address: ADDRESS, tls: true });
  });

  it('stays plaintext on an explicit TEMPORAL_TLS=false', () => {
    expect(tlsOptions({ TEMPORAL_TLS: 'false' })).toEqual({ address: ADDRESS });
  });

  // Mirrors the SDK's own normalizeTlsConfig, which turns TLS on whenever an
  // apiKey is present. Temporal Cloud rejects an API key sent in the clear.
  it('infers TLS from an API key alone', () => {
    expect(tlsOptions({ TEMPORAL_API_KEY: 'tmprl-key' })).toEqual({
      address: ADDRESS,
      tls: true,
      apiKey: 'tmprl-key',
    });
  });

  it('loads a private CA certificate', () => {
    const read = fakeReader();

    expect(tlsOptions({ TEMPORAL_TLS_CA_PATH: '/certs/ca.pem' }, read)).toEqual({
      address: ADDRESS,
      tls: { serverRootCACertificate: bytes('/certs/ca.pem') },
    });
    expect(read).toHaveBeenCalledWith('/certs/ca.pem');
  });

  it('loads a full mTLS pair alongside the CA', () => {
    const env = {
      TEMPORAL_TLS_CA_PATH: '/certs/ca.pem',
      TEMPORAL_TLS_CERT_PATH: '/certs/client.pem',
      TEMPORAL_TLS_KEY_PATH: '/certs/client.key',
    };

    expect(tlsOptions(env)).toEqual({
      address: ADDRESS,
      tls: {
        serverRootCACertificate: bytes('/certs/ca.pem'),
        clientCertPair: { crt: bytes('/certs/client.pem'), key: bytes('/certs/client.key') },
      },
    });
  });
});

describe('temporalConfig rejects contradictory TLS config at connect time', () => {
  it('refuses half an mTLS pair', () => {
    expect(() => tlsOptions({ TEMPORAL_TLS_CERT_PATH: '/certs/client.pem' })).toThrow(/must be set together/);
    expect(() => tlsOptions({ TEMPORAL_TLS_KEY_PATH: '/certs/client.key' })).toThrow(/must be set together/);
  });

  it('refuses an API key and a client certificate together', () => {
    const both = {
      TEMPORAL_API_KEY: 'k',
      TEMPORAL_TLS_CERT_PATH: '/certs/client.pem',
      TEMPORAL_TLS_KEY_PATH: '/certs/client.key',
    };

    expect(() => tlsOptions(both)).toThrow(/not both/);
  });

  it('refuses credentials that TEMPORAL_TLS=false would silently discard', () => {
    const contradiction = { TEMPORAL_TLS: 'false', TEMPORAL_API_KEY: 'k' };

    expect(() => tlsOptions(contradiction)).toThrow(/contradicts/);
  });

  it('refuses a TEMPORAL_TLS value that is neither true nor false', () => {
    expect(() => tlsOptions({ TEMPORAL_TLS: 'yes' })).toThrow(/must be 'true'/);
  });

  it('names the variable and the path when a certificate cannot be read', () => {
    const explode = vi.fn(() => {
      throw new Error('ENOENT');
    });

    expect(() => tlsOptions({ TEMPORAL_TLS_CA_PATH: '/nope.pem' }, explode)).toThrow(
      /TEMPORAL_TLS_CA_PATH \(\/nope\.pem\)/,
    );
  });
});

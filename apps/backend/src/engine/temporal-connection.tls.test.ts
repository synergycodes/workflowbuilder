// Drives the options this builder produces through a real TLS handshake: a Temporal
// dev server behind a TLS-terminating proxy, with certificates minted for the run.
// The unit tests next door prove the shape of the options; this file proves they connect.
import { Client, Connection } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type TestPki,
  type TestPkiFiles,
  createTestPki,
  startAuthorizationSink,
  startTlsProxy,
  writeTestPki,
} from '@workflow-builder/tools/tls-test-harness';

import { type TemporalConnectionConfig, buildTemporalConnectionOptions } from './temporal-connection';

const NAMESPACE = 'tls-test';
const CONNECT_TIMEOUT = '3s';

const empty: TemporalConnectionConfig = { tls: null, apiKey: null, caPath: null, certPath: null, keyPath: null };

function config(overrides: Partial<TemporalConnectionConfig>): TemporalConnectionConfig {
  return { ...empty, ...overrides };
}

function connectVia(address: string, overrides: Partial<TemporalConnectionConfig>) {
  return Connection.connect({
    address,
    connectTimeout: CONNECT_TIMEOUT,
    ...buildTemporalConnectionOptions(config(overrides)),
  });
}

type Pki = { pki: TestPki; files: TestPkiFiles };

function mint(name: string): Pki {
  const pki = createTestPki(name);
  return { pki, files: writeTestPki(pki, name) };
}

describe('Temporal client over TLS', () => {
  let env: TestWorkflowEnvironment;
  // `trusted` is what the server presents and requires; `stranger` is a second, unrelated CA.
  let trusted: Pki;
  let stranger: Pki;

  beforeAll(async () => {
    [env, trusted, stranger] = await Promise.all([
      TestWorkflowEnvironment.createLocal({ server: { extraArgs: ['--namespace', NAMESPACE] } }),
      mint('trusted'),
      mint('stranger'),
    ]);
  }, 300_000);

  afterAll(async () => {
    await env?.teardown();
  });

  it('connects through a private CA and starts a workflow in a non-default namespace', async () => {
    const proxy = await startTlsProxy({ upstream: env.address, server: trusted.pki.server });
    try {
      const connection = await connectVia(proxy.address, { caPath: trusted.files.ca });
      const client = new Client({ connection, namespace: NAMESPACE });
      const handle = await client.workflow.start('tls-probe', {
        taskQueue: 'tls-probe',
        workflowId: `tls-probe-${Date.now()}`,
      });

      // Read back over the dev server's own plaintext connection, so the assertion
      // does not depend on the connection under test.
      const inNamespace = new Client({ connection: env.connection, namespace: NAMESPACE });
      await expect(inNamespace.workflow.getHandle(handle.workflowId).describe()).resolves.toMatchObject({
        status: { name: 'RUNNING' },
      });
      await expect(env.client.workflow.getHandle(handle.workflowId).describe()).rejects.toThrow();

      await handle.terminate('tls test done');
      await connection.close();
      expect(proxy.handshakeErrors).toEqual([]);
    } finally {
      await proxy.close();
    }
  }, 60_000);

  it('authenticates with a client certificate when the server requires one', async () => {
    const proxy = await startTlsProxy({
      upstream: env.address,
      server: trusted.pki.server,
      clientCa: trusted.pki.ca.cert,
    });
    try {
      const connection = await connectVia(proxy.address, {
        caPath: trusted.files.ca,
        certPath: trusted.files.clientCert,
        keyPath: trusted.files.clientKey,
      });
      await expect(connection.workflowService.describeNamespace({ namespace: NAMESPACE })).resolves.toMatchObject({
        namespaceInfo: { name: NAMESPACE },
      });
      await connection.close();
      expect(proxy.handshakeErrors).toEqual([]);
    } finally {
      await proxy.close();
    }
  }, 60_000);

  it('refuses a server certificate from a CA it does not trust', async () => {
    const proxy = await startTlsProxy({ upstream: env.address, server: trusted.pki.server });
    try {
      await expect(connectVia(proxy.address, { caPath: stranger.files.ca })).rejects.toThrow();
      await expect.poll(() => proxy.handshakeErrors.length).toBeGreaterThan(0);
    } finally {
      await proxy.close();
    }
  }, 60_000);

  it('is refused when its client certificate comes from the wrong CA', async () => {
    const proxy = await startTlsProxy({
      upstream: env.address,
      server: trusted.pki.server,
      clientCa: trusted.pki.ca.cert,
    });
    try {
      await expect(
        connectVia(proxy.address, {
          caPath: trusted.files.ca,
          certPath: stranger.files.clientCert,
          keyPath: stranger.files.clientKey,
        }),
      ).rejects.toThrow();
      await expect.poll(() => proxy.handshakeErrors.length).toBeGreaterThan(0);
    } finally {
      await proxy.close();
    }
  }, 60_000);

  it('sends TEMPORAL_API_KEY as a bearer token inside the TLS session', async () => {
    const sink = await startAuthorizationSink(trusted.pki.server);
    try {
      // the sink answers UNAUTHENTICATED on purpose; the header having arrived is the assertion
      await expect(connectVia(sink.address, { apiKey: 'synthetic-key', caPath: trusted.files.ca })).rejects.toThrow();
      expect(sink.authorizations).toContain('Bearer synthetic-key');
    } finally {
      await sink.close();
    }
  }, 60_000);
});

// Drives the options this package builds through a real TLS handshake on both SDK
// transports: grpc-js in @temporalio/client and the Rust core in @temporalio/worker.
// A Temporal dev server sits behind a TLS-terminating proxy; certificates are minted
// per run. The unit tests prove the shape of the options; this file proves they connect.
import { Client, Connection } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { NativeConnection, Worker } from '@temporalio/worker';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { temporalConfig } from '../src/index';
import {
  type TestPki,
  type TestPkiFiles,
  createTestPki,
  startAuthorizationSink,
  startTlsProxy,
  writeTestPki,
} from './harness';

const NAMESPACE = 'tls-test';
const TASK_QUEUE = 'tls-probe';

type Pki = { pki: TestPki; files: TestPkiFiles };

function mint(name: string): Pki {
  const pki = createTestPki(name);
  return { pki, files: writeTestPki(pki, name) };
}

type Transport = {
  name: string;
  connect: (address: string, env: NodeJS.ProcessEnv) => Promise<{ close(): Promise<void> }>;
};

// Handing the built options to each SDK's own connect call is also the compile-time
// proof that the shared contract is assignable to both option types without a cast.
function connectClient(address: string, env: NodeJS.ProcessEnv) {
  const { connection } = temporalConfig({ TEMPORAL_ADDRESS: address, ...env });
  return Connection.connect({ connectTimeout: '3s', ...connection });
}

function connectWorker(address: string, env: NodeJS.ProcessEnv) {
  return NativeConnection.connect(temporalConfig({ TEMPORAL_ADDRESS: address, ...env }).connection);
}

const transports: Transport[] = [
  { name: '@temporalio/client (grpc-js)', connect: connectClient },
  { name: '@temporalio/worker (native core)', connect: connectWorker },
];

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
  for (const minted of [trusted, stranger]) {
    if (minted) rmSync(minted.files.directory, { recursive: true, force: true });
  }
});

describe.each(transports)('$name over TLS', ({ connect }) => {
  it('connects through a private CA', async () => {
    const proxy = await startTlsProxy({ upstream: env.address, server: trusted.pki.server });
    try {
      const connection = await connect(proxy.address, { TEMPORAL_TLS_CA_PATH: trusted.files.ca });
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
      const connection = await connect(proxy.address, {
        TEMPORAL_TLS_CA_PATH: trusted.files.ca,
        TEMPORAL_TLS_CERT_PATH: trusted.files.clientCert,
        TEMPORAL_TLS_KEY_PATH: trusted.files.clientKey,
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
      await expect(connect(proxy.address, { TEMPORAL_TLS_CA_PATH: stranger.files.ca })).rejects.toThrow();
      // the proxy records the failed handshake asynchronously, after the client has given up
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
        connect(proxy.address, {
          TEMPORAL_TLS_CA_PATH: trusted.files.ca,
          TEMPORAL_TLS_CERT_PATH: stranger.files.clientCert,
          TEMPORAL_TLS_KEY_PATH: stranger.files.clientKey,
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
      await expect(
        connect(sink.address, { TEMPORAL_API_KEY: 'synthetic-key', TEMPORAL_TLS_CA_PATH: trusted.files.ca }),
      ).rejects.toThrow();
      expect(sink.authorizations).toContain('Bearer synthetic-key');
    } finally {
      await sink.close();
    }
  }, 60_000);
});

describe('work in a non-default namespace over a private CA', () => {
  it('a client starts a workflow that lands in the configured namespace', async () => {
    const proxy = await startTlsProxy({ upstream: env.address, server: trusted.pki.server });
    try {
      const config = temporalConfig({
        TEMPORAL_ADDRESS: proxy.address,
        TEMPORAL_NAMESPACE: NAMESPACE,
        TEMPORAL_TLS_CA_PATH: trusted.files.ca,
      });
      const connection = await Connection.connect(config.connection);
      const client = new Client({ connection, namespace: config.namespace });
      const handle = await client.workflow.start('tls-probe', {
        taskQueue: TASK_QUEUE,
        workflowId: `tls-probe-client-${Date.now()}`,
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

  it('a worker polls the configured namespace and completes a workflow', async () => {
    const proxy = await startTlsProxy({ upstream: env.address, server: trusted.pki.server });
    try {
      const config = temporalConfig({
        TEMPORAL_ADDRESS: proxy.address,
        TEMPORAL_NAMESPACE: NAMESPACE,
        TEMPORAL_TLS_CA_PATH: trusted.files.ca,
      });
      const connection = await NativeConnection.connect(config.connection);
      const worker = await Worker.create({
        connection,
        namespace: config.namespace,
        taskQueue: TASK_QUEUE,
        workflowsPath: fileURLToPath(new URL('fixtures/tls-probe-workflow.ts', import.meta.url)),
      });
      // The client submits over the dev server's own plaintext connection; only the
      // worker's polling and completion travel through TLS.
      const client = new Client({ connection: env.connection, namespace: NAMESPACE });
      const result = await worker.runUntil(
        client.workflow.execute('tlsProbe', { taskQueue: TASK_QUEUE, workflowId: `tls-probe-worker-${Date.now()}` }),
      );

      expect(result).toBe('pong');
      await connection.close();
      expect(proxy.handshakeErrors).toEqual([]);
    } finally {
      await proxy.close();
    }
  }, 120_000);
});

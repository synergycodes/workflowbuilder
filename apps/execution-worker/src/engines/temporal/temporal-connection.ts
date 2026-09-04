// Turns the TEMPORAL_* env vars into Temporal connection options.
//
// Duplicated by design from apps/backend/src/engine/temporal-connection.ts: the two
// SDKs type their options separately (the client accepts a function for `apiKey`, the
// worker's native connection only a string), so a shared module would have to pick one
// and cast. Keep the two copies in sync.
import type { NativeConnectionOptions } from '@temporalio/worker';
import { readFileSync } from 'node:fs';

export type TemporalConnectionConfig = {
  // Raw TEMPORAL_TLS. Tri-state on purpose: unset means "infer from the rest",
  // which is not the same as an explicit 'false'.
  tls: string | null;
  apiKey: string | null;
  caPath: string | null;
  certPath: string | null;
  keyPath: string | null;
};

type TemporalConnectionOptions = Pick<NativeConnectionOptions, 'tls' | 'apiKey'>;

export function buildTemporalConnectionOptions(
  config: TemporalConnectionConfig,
  readFile: (path: string) => Uint8Array = readFileSync,
): TemporalConnectionOptions {
  const { tls, apiKey, caPath, certPath, keyPath } = config;

  if (tls !== null && tls !== 'true' && tls !== 'false') {
    throw new Error(`TEMPORAL_TLS must be 'true' or 'false' (got '${tls}').`);
  }
  if (Boolean(certPath) !== Boolean(keyPath)) {
    throw new Error(
      'TEMPORAL_TLS_CERT_PATH and TEMPORAL_TLS_KEY_PATH must be set together — mTLS needs both halves of the pair.',
    );
  }
  if (apiKey && certPath) {
    throw new Error('Set either TEMPORAL_API_KEY or an mTLS client certificate pair, not both.');
  }

  const hasTlsMaterial = Boolean(apiKey || caPath || certPath);
  if (tls === 'false' && hasTlsMaterial) {
    throw new Error(
      'TEMPORAL_TLS=false contradicts the TEMPORAL_API_KEY / TEMPORAL_TLS_*_PATH values that are set — remove one side.',
    );
  }

  // Material implies TLS, matching what the SDK already does for apiKey. Being
  // explicit here keeps the client and the worker in step and makes it testable.
  if (tls !== 'true' && !hasTlsMaterial) {
    // Plaintext — the local-dev default, and what this worker did before.
    return {};
  }

  const certificates = {
    ...(caPath ? { serverRootCACertificate: read(readFile, caPath, 'TEMPORAL_TLS_CA_PATH') } : {}),
    ...(certPath && keyPath
      ? {
          clientCertPair: {
            crt: read(readFile, certPath, 'TEMPORAL_TLS_CERT_PATH'),
            key: read(readFile, keyPath, 'TEMPORAL_TLS_KEY_PATH'),
          },
        }
      : {}),
  };

  return {
    // `true` means TLS with the OS trust store — enough for Temporal Cloud.
    tls: Object.keys(certificates).length > 0 ? certificates : true,
    ...(apiKey ? { apiKey } : {}),
  };
}

function read(readFile: (path: string) => Uint8Array, path: string, variable: string): Uint8Array {
  try {
    return readFile(path);
  } catch (error) {
    throw new Error(`Could not read ${variable} (${path}).`, { cause: error });
  }
}

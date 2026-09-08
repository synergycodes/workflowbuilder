import { readFileSync } from 'node:fs';

export type TemporalTlsOptions = {
  serverRootCACertificate?: Uint8Array;
  clientCertPair?: { crt: Uint8Array; key: Uint8Array };
};

// The subset both SDKs accept as-is: the client also takes an apiKey function and
// tls: false | null, neither of which this module ever produces.
export type TemporalConnectionOptions = {
  address: string;
  tls?: true | TemporalTlsOptions;
  apiKey?: string;
};

export type TemporalConfig = {
  connection: TemporalConnectionOptions;
  // Not a connection option — it goes to the Client and the Worker — but it must
  // match between the two, so it is read here alongside the rest.
  namespace: string;
};

// 127.0.0.1, not `localhost`: the local docker stack binds loopback IPv4 only, and
// some Node setups resolve `localhost` to ::1 first (see apps/backend/src/env.ts).
const DEFAULT_ADDRESS = '127.0.0.1:7233';
// Temporal Cloud spells it `<namespace>.<accountId>`.
const DEFAULT_NAMESPACE = 'default';

type Config = {
  // Raw TEMPORAL_TLS. Tri-state on purpose: unset means "infer from the rest",
  // which is not the same as an explicit 'false'.
  tls: string | null;
  apiKey: string | null;
  caPath: string | null;
  certPath: string | null;
  keyPath: string | null;
};

export function temporalConfig(
  env: NodeJS.ProcessEnv = process.env,
  readFile: (path: string) => Uint8Array = readFileSync,
): TemporalConfig {
  return {
    connection: { address: env['TEMPORAL_ADDRESS'] || DEFAULT_ADDRESS, ...connectionOptions(env, readFile) },
    namespace: env['TEMPORAL_NAMESPACE'] || DEFAULT_NAMESPACE,
  };
}

function connectionOptions(
  env: NodeJS.ProcessEnv,
  readFile: (path: string) => Uint8Array,
): Omit<TemporalConnectionOptions, 'address'> {
  const { tls, apiKey, caPath, certPath, keyPath } = read(env);

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

  // Material implies TLS, matching what the SDKs already do for apiKey. Being
  // explicit here keeps the client and the worker in step and makes it testable.
  if (tls !== 'true' && !hasTlsMaterial) {
    // Plaintext — the local-dev default.
    return {};
  }

  const certificates: TemporalTlsOptions = {
    ...(caPath ? { serverRootCACertificate: readPem(readFile, caPath, 'TEMPORAL_TLS_CA_PATH') } : {}),
    ...(certPath && keyPath
      ? {
          clientCertPair: {
            crt: readPem(readFile, certPath, 'TEMPORAL_TLS_CERT_PATH'),
            key: readPem(readFile, keyPath, 'TEMPORAL_TLS_KEY_PATH'),
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

function read(env: NodeJS.ProcessEnv): Config {
  // Empty string counts as unset: compose passes absent optionals through as
  // `${VAR:-}`, and a bare `?? null` would read '' as a configured value.
  const optional = (name: string) => env[name] || null;
  return {
    tls: optional('TEMPORAL_TLS'),
    apiKey: optional('TEMPORAL_API_KEY'),
    caPath: optional('TEMPORAL_TLS_CA_PATH'),
    certPath: optional('TEMPORAL_TLS_CERT_PATH'),
    keyPath: optional('TEMPORAL_TLS_KEY_PATH'),
  };
}

function readPem(readFile: (path: string) => Uint8Array, path: string, variable: string): Uint8Array {
  try {
    return readFile(path);
  } catch (error) {
    throw new Error(`Could not read ${variable} (${path}).`, { cause: error });
  }
}

# @workflow-builder/temporal-connection

Private, source-only. Turns the `TEMPORAL_*` environment variables into everything the apps need to reach Temporal — connection options and the namespace — and holds the one copy of the rules: the defaults, which combinations are contradictory, when TLS is inferred, and how certificate files are read.

Two consumers hand the result straight to their SDK: `apps/backend/src/engine/index.ts` (`@temporalio/client`) and `apps/execution-worker/src/engines/temporal/worker.ts` (`@temporalio/worker`). Change a rule here and both apps follow; a rule that only one of them should have does not belong here.

Nothing is validated at import time. `temporalConfig` reads `process.env` (or the environment it is given) when called and throws on a bad combination, so each app calls it where it wants the failure surfaced — the backend in its first-connection factory, the worker before it starts polling.

```ts
import { temporalConfig } from '@workflow-builder/temporal-connection';

const { connection, namespace } = temporalConfig();
// connection: { address } for plaintext, { address, tls: true } for the OS trust store,
//             { address, tls: { serverRootCACertificate, clientCertPair? }, apiKey? } otherwise
// namespace:  TEMPORAL_NAMESPACE, 'default' when unset
```

Tests: `src/index.test.ts` is the validation matrix. `test/tls.test.ts` drives the built options through a real TLS handshake on both SDK transports (grpc-js and the worker's native core) against a Temporal dev server behind a TLS-terminating proxy (`test/harness/`), with certificates minted per run — private CA, mutual TLS, untrusted server CA, wrong client certificate, an API key inside the TLS session, and work in a non-default namespace. Handing the connection options to both SDKs' connect calls there is the compile-time proof that the contract fits both.

This module is engine plumbing, not part of the execution model, so it is neither in `execution-core` nor in the published `@workflowbuilder/temporal` API.

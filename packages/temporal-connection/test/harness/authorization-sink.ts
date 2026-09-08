import { type Http2SecureServer, type Http2Session, createSecureServer } from 'node:http2';
import type { AddressInfo } from 'node:net';

import type { PemPair } from './certificates';

type AuthorizationSink = {
  address: string;
  /** The `authorization` header of every gRPC call received, in order. */
  authorizations: string[];
  close: () => Promise<void>;
};

/**
 * A TLS endpoint that records the `authorization` header of each gRPC request and
 * answers UNAUTHENTICATED, so a client's connect attempt fails fast instead of hanging.
 * The header travels inside the encrypted HTTP/2 stream, so a TCP-level proxy cannot see it.
 */
export async function startAuthorizationSink(server: PemPair): Promise<AuthorizationSink> {
  const authorizations: string[] = [];
  const sessions = new Set<Http2Session>();

  const http2Server: Http2SecureServer = createSecureServer({ cert: server.cert, key: server.key, allowHTTP1: false });
  http2Server.on('session', (session) => {
    sessions.add(session);
    session.on('close', () => sessions.delete(session));
  });
  http2Server.on('stream', (stream, headers) => {
    authorizations.push(String(headers.authorization ?? ''));
    stream.respond(
      { ':status': 200, 'content-type': 'application/grpc', 'grpc-status': '16', 'grpc-message': 'authorization sink' },
      { endStream: true },
    );
  });

  await new Promise<void>((resolve) => http2Server.listen(0, resolve));
  const { port } = http2Server.address() as AddressInfo;

  return {
    address: `localhost:${port}`,
    authorizations,
    close: () =>
      new Promise((resolve) => {
        for (const session of sessions) session.destroy();
        http2Server.close(() => resolve());
      }),
  };
}

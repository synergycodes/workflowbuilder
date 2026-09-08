import { type AddressInfo, type Socket, connect } from 'node:net';
import { type TlsOptions, createServer } from 'node:tls';

import type { PemPair } from './certificates';

type TlsProxy = {
  /** host:port a Temporal client can dial; the hostname is covered by the server certificate's SAN. */
  address: string;
  /** One entry per failed handshake, whichever side aborted it. */
  handshakeErrors: string[];
  close: () => Promise<void>;
};

type TlsProxyOptions = {
  /** host:port of the plaintext Temporal server behind the proxy. */
  upstream: string;
  server: PemPair;
  /** When set, a client certificate signed by this CA is required. */
  clientCa?: string;
};

/**
 * Terminates TLS in front of a plaintext Temporal server and forwards the bytes as-is.
 * gRPC frames pass through untouched, so what is exercised is the client's transport:
 * server-certificate trust, hostname check, ALPN and, with `clientCa`, mutual TLS.
 */
export async function startTlsProxy({ upstream, server, clientCa }: TlsProxyOptions): Promise<TlsProxy> {
  const [upstreamHost, upstreamPort] = splitAddress(upstream);
  const handshakeErrors: string[] = [];
  const sockets = new Set<Socket>();

  const options: TlsOptions = {
    cert: server.cert,
    key: server.key,
    // gRPC clients hang up on a server that does not select h2
    ALPNProtocols: ['h2'],
    ...(clientCa ? { ca: clientCa, requestCert: true, rejectUnauthorized: true } : {}),
  };

  const tlsServer = createServer(options, (downstream) => {
    const upstreamSocket = connect({ host: upstreamHost, port: upstreamPort });
    sockets.add(downstream);
    sockets.add(upstreamSocket);
    downstream.pipe(upstreamSocket).pipe(downstream);
    const drop = () => {
      downstream.destroy();
      upstreamSocket.destroy();
    };
    downstream.on('error', drop);
    upstreamSocket.on('error', drop);
    downstream.on('close', drop);
    upstreamSocket.on('close', drop);
  });
  tlsServer.on('tlsClientError', (error) => handshakeErrors.push(error.message));

  await new Promise<void>((resolve) => tlsServer.listen(0, resolve));
  const { port } = tlsServer.address() as AddressInfo;

  return {
    address: `localhost:${port}`,
    handshakeErrors,
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        tlsServer.close(() => resolve());
      }),
  };
}

function splitAddress(address: string): [string, number] {
  const separator = address.lastIndexOf(':');
  return [address.slice(0, separator), Number(address.slice(separator + 1))];
}

// Handed to Temporal's bundler by path from tls.test.ts. All the test needs is proof
// that a task round-trips through the worker's TLS connection.
export async function tlsProbe(): Promise<string> {
  return 'pong';
}

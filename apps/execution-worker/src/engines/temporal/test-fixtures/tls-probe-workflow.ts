// Bundled by path in temporal-connection.tls.test.ts; the real workflows.ts would
// drag the whole plugin in, and the test only needs proof that a task round-trips.
export async function tlsProbe(): Promise<string> {
  return 'pong';
}

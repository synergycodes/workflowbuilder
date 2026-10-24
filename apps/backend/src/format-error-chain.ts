// A client wraps a transport failure in a generic message (Temporal's "Failed to start Workflow",
// Node's "fetch failed"); the reason sits down the cause chain.
export function formatErrorChain(error: unknown): string {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message) messages.push(current.message);
    current = current.cause;
  }
  return messages.length > 0 ? messages.join(': ') : String(error);
}

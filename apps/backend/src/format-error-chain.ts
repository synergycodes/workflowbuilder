// A client wraps a transport failure in a generic message (Temporal's "Failed to start Workflow",
// Node's "fetch failed"); the reason sits down the cause chain.
export function formatErrorChain(error: unknown): string {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const message = messageOf(current);
    if (message) messages.push(message);
    current = current.cause;
  }
  return messages.length > 0 ? messages.join(': ') : String(error);
}

// Node's fetch reports a refused dual-stack connect as an AggregateError with an empty message:
// the reasons sit in `errors`, the summary in `code`.
function messageOf(error: Error): string {
  if (error.message) return error.message;
  if (error instanceof AggregateError) {
    const reasons = error.errors.filter((inner): inner is Error => inner instanceof Error && inner.message !== '');
    if (reasons.length > 0) return reasons.map((inner) => inner.message).join(', ');
  }
  const code: unknown = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

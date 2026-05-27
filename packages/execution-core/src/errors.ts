// NodeExecutionError lets executors emit structured error codes that the
// graph runner forwards into node_failed event payloads. Plain Error still
// works (no code field emitted). Pass `cause` to wrap an underlying failure
// (a fetch timeout, a Zod parse error, etc.) without losing the original
// stack trace.
export class NodeExecutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'NodeExecutionError';
  }
}

/**
 * Walks the ES2022 `Error.cause` chain to the deepest cause and returns its
 * message. Adapters that wrap activity throws (Temporal's `ActivityFailure`
 * is the canonical example) expose a generic top-level message
 * ("Activity task failed") while keeping the real reason one or two levels
 * deeper in `cause`. Returning the wrapper message would hide every actual
 * failure (`Malformed template reference: …`, LLM rate limit, DB timeout)
 * behind the same opaque string. Walking the chain surfaces the cause that
 * the operator actually needs to act on.
 *
 * Picks up `code` at the FIRST level that carries one, so a downstream wrap
 * in a generic `Error` does not erase the structured `NodeExecutionError`
 * code emitted by the original throw site.
 *
 * The walk is bounded by `MAX_CAUSE_DEPTH` so a buggy adapter that builds a
 * cyclic chain (`a.cause = b; b.cause = a`) cannot spin the runner forever.
 * This is sandbox-safe code: an infinite loop here hangs the Temporal
 * workflow indefinitely AND wedges every replay of it. The cap is part of
 * the contract, see `replay-audit.md`. Real-world chains seen in adapters
 * (Temporal `ActivityFailure` → `ApplicationFailure` → original) are 2-3
 * deep; 16 leaves ample headroom while keeping the bound trivially small.
 */
const MAX_CAUSE_DEPTH = 16;

export function extractDeepestError(error: unknown): { message: string; code?: string } {
  let current: unknown = error;
  let code: string | undefined;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (code === undefined && current instanceof NodeExecutionError) {
      code = current.code;
    }
    if (current.cause === undefined || current.cause === null) break;
    current = current.cause;
  }

  return {
    message: current instanceof Error ? current.message : String(current),
    code,
  };
}

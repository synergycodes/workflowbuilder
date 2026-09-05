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

export type NodeErrorClassification = 'permanent' | 'transient';

// Fails identically on every retry (rejected key, a 400, unsatisfiable config);
// the adapter stops the node on its first attempt.
export class PermanentNodeExecutionError extends NodeExecutionError {
  readonly classification: NodeErrorClassification = 'permanent';

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(code, message, options);
    this.name = 'PermanentNodeExecutionError';
  }
}

// A later attempt could succeed (timeout, 429, 5xx). Retried within the
// engine's own limit, never past it.
export class TransientNodeExecutionError extends NodeExecutionError {
  readonly classification: NodeErrorClassification = 'transient';

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(code, message, options);
    this.name = 'TransientNodeExecutionError';
  }
}

// By shape, not `instanceof`: the adapter runs against a bundled copy of this
// module, so the class objects differ. `code` is required too, so a foreign
// error with a stray `classification` field does not match.
export function classifyNodeError(error: unknown): NodeErrorClassification | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const { classification, code } = error as { classification?: unknown; code?: unknown };
  if (typeof code !== 'string') {
    return undefined;
  }

  return classification === 'permanent' || classification === 'transient' ? classification : undefined;
}

// Travels in the adapter's failure `details`: engines flatten a throw to message
// and type, so the code and attempt survive only as plain data. `wbNodeError`
// brands and versions the shape — a later shape bumps the number, so older
// histories keep replaying against this one.
export type NodeErrorEnvelope = {
  wbNodeError: 1;
  classification: NodeErrorClassification;
  code: string;
  attempt: number;
};

function readEnvelope(error: Error): NodeErrorEnvelope | undefined {
  const { details } = error as { details?: unknown };
  if (!Array.isArray(details)) {
    return undefined;
  }

  const candidate: unknown = details[0];
  if (typeof candidate !== 'object' || candidate === null) {
    return undefined;
  }

  const { wbNodeError, classification, code, attempt } = candidate as Record<string, unknown>;
  if (wbNodeError !== 1) {
    return undefined;
  }
  if (classification !== 'permanent' && classification !== 'transient') {
    return undefined;
  }
  if (typeof code !== 'string' || typeof attempt !== 'number') {
    return undefined;
  }

  return { wbNodeError, classification, code, attempt };
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
 * code emitted by the original throw site. A `NodeErrorEnvelope` in `details`
 * (left by an adapter when the object did not survive a boundary) is read the
 * same way, at a fixed check order so replay sees identical results.
 * `attempt` comes only from the envelope — the runner cannot observe retries.
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

export function extractDeepestError(error: unknown): { message: string; code?: string; attempt?: number } {
  let current: unknown = error;
  let code: string | undefined;
  let attempt: number | undefined;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (code === undefined && current instanceof NodeExecutionError) {
      code = current.code;
    }
    if (attempt === undefined) {
      const envelope = readEnvelope(current);
      if (envelope !== undefined) {
        code ??= envelope.code;
        attempt = envelope.attempt;
      }
    }
    if (current.cause === undefined || current.cause === null) break;
    current = current.cause;
  }

  return {
    message: current instanceof Error ? current.message : String(current),
    code,
    attempt,
  };
}

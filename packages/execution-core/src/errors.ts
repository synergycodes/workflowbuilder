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

/**
 * Thrown by an executor for a failure that will fail identically on every
 * retry: a rejected API key, a 400, a config the node can never satisfy.
 * The engine adapter stops the node on its first attempt.
 */
export class PermanentNodeExecutionError extends NodeExecutionError {
  readonly classification: NodeErrorClassification = 'permanent';

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(code, message, options);
    this.name = 'PermanentNodeExecutionError';
  }
}

/**
 * Thrown by an executor for a failure a later attempt could survive: a
 * timeout, a rate limit, a 5xx. Retried under the engine's own policy —
 * marking transient does not raise the attempt limit, it only says the
 * error is worth another attempt and makes the count visible.
 */
export class TransientNodeExecutionError extends NodeExecutionError {
  readonly classification: NodeErrorClassification = 'transient';

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(code, message, options);
    this.name = 'TransientNodeExecutionError';
  }
}

/**
 * Classification is read by shape, never with `instanceof`. An executor
 * throws the class compiled into the core's own source, while the adapter
 * that inspects the throw runs against a bundled copy of this module — two
 * distinct class objects, so `instanceof` is always false between them.
 * Requiring `code` alongside `classification` keeps a foreign error that
 * happens to carry a `classification` field from matching, and leaving
 * `name` out of the check lets a consumer subclass keep its own name.
 */
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

/**
 * What the adapter attaches to the failure it sends across the engine
 * boundary, and the only thing the runner reads back. Engines flatten a
 * thrown error into a message and a type, so the structured parts of a
 * classified throw — the code, and the attempt it died on — survive only
 * as plain data travelling alongside it.
 *
 * `wbNodeError` brands the object (adapters put arbitrary values in the
 * same slot) and versions it: a later shape bumps the number rather than
 * widening this one, so a runner replaying an older history keeps reading
 * exactly the shape it was written with.
 */
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
 * code emitted by the original throw site. Two levels can carry one: the
 * original error object (in-process runs, where the throw arrives intact)
 * and a `NodeErrorEnvelope` left by an engine adapter (runs that crossed a
 * boundary, where the object did not survive). Both are read, the first
 * one found wins, and the order they are checked in is fixed — the walk
 * has to return the same result for the same input on every replay.
 *
 * `attempt` comes from the envelope alone: nothing inside the runner can
 * observe how many times an adapter retried a node.
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

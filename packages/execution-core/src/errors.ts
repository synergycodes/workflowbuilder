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

export type LogBindings = Record<string, unknown>;

// Structured-logging seam. Consumers route logs through this port instead of
// calling console directly, so a pino/Datadog/Loki adapter can be swapped in
// without touching execution-core or the reference backend.
//
// Levels mirror the standard pino/winston/bunyan set. `child` returns a logger
// that merges the given bindings into every subsequent line — the graph runner
// uses it to attach workflow/execution/node context before delegating into
// per-node work.
export interface LoggerPort {
  debug(message: string, bindings?: LogBindings): void;
  info(message: string, bindings?: LogBindings): void;
  warn(message: string, bindings?: LogBindings): void;
  error(message: string, bindings?: LogBindings): void;
  child(bindings: LogBindings): LoggerPort;
}

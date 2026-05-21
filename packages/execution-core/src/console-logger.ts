import type { LogBindings, LoggerPort } from './ports/logger.port';

export type ConsoleLoggerOptions = {
  // Pretty-print one human-readable line per call instead of JSON. Use in
  // dev where a person tails the terminal; keep JSON in prod where a sink
  // (Datadog/Loki/...) ingests structured records.
  pretty?: boolean;
};

// Default LoggerPort implementation: writes a single-line record per call
// to the appropriate console level. Zero dependencies, suitable for the
// reference backend and worker. Swap in a pino/Datadog/Loki adapter when
// structured shipping is required (see the package README for an example).
export function createConsoleLogger(bindings: LogBindings = {}, options: ConsoleLoggerOptions = {}): LoggerPort {
  const emit = (level: 'debug' | 'info' | 'warn' | 'error', message: string, extra: LogBindings = {}): void => {
    const merged = { ...bindings, ...extra };
    const time = new Date().toISOString();
    const line = options.pretty
      ? formatPretty(time, level, message, merged)
      : JSON.stringify({ level, time, msg: message, ...merged });
    console[level](line);
  };

  return {
    debug: (message, extra) => emit('debug', message, extra),
    info: (message, extra) => emit('info', message, extra),
    warn: (message, extra) => emit('warn', message, extra),
    error: (message, extra) => emit('error', message, extra),
    child: (extra) => createConsoleLogger({ ...bindings, ...extra }, options),
  };
}

function formatPretty(time: string, level: string, message: string, bindings: LogBindings): string {
  const tail = Object.keys(bindings).length > 0 ? `  ${JSON.stringify(bindings)}` : '';
  return `${time} ${level.toUpperCase().padEnd(5)} ${message}${tail}`;
}

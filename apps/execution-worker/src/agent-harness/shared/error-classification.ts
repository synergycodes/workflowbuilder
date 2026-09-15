/**
 * Error classification and subprocess-failure formatting shared by agent-harness
 * providers and the executing activity.
 *
 * Ported from a subset of Archon's `packages/workflows/src/executor-shared.ts`
 * (`matchesPattern`, `classifyError`, `isRateLimitError`, `getRetryDelayMs`,
 * `formatSubprocessFailure`). Retry itself is out of scope for v1 — the node
 * runs with a single attempt — but `getRetryDelayMs` is kept for a future
 * stretch-goal retry port (see the porting plan §7 "Stretch").
 */
import {
  NodeExecutionError,
  PermanentNodeExecutionError,
  TransientNodeExecutionError,
} from '@workflow-builder/execution-core';

// ─── Error Classification ────────────────────────────────────────────────────

/** Result of error classification */
export type ErrorType = 'TRANSIENT' | 'FATAL' | 'UNKNOWN';

const QUOTA_EXHAUSTION_PATTERNS = [
  'session limit',
  'usage limit reached',
  'credit exhaustion',
  'credit balance',
] as const;

/** Fatal errors: authentication/authorization failures plus quota exhaustion. */
export const FATAL_PATTERNS = [
  'unauthorized',
  'forbidden',
  'invalid token',
  'authentication failed',
  'permission denied',
  '401',
  '403',
  ...QUOTA_EXHAUSTION_PATTERNS,
];

/** Ambiguous fatal patterns that yield to concrete transient evidence. */
const FALLBACK_FATAL_PATTERNS = ['auth error'];

/**
 * Rate/concurrency pressure (429, provider overload) — a subset of TRANSIENT that
 * sheds load on a minutes-scale window, so it earns its own patient backoff policy
 * (see {@link getRetryDelayMs}) instead of the generic short exponential one.
 * Defined first so {@link TRANSIENT_PATTERNS} derives from it: a pattern can never
 * widen the rate-limit budget while classifyError treats it as non-transient.
 */
export const RATE_LIMIT_PATTERNS = [
  '429',
  'rate limit',
  'too many requests',
  'overloaded', // Anthropic/Minimax overload message text
  'at capacity', // Codex/OpenAI model-level saturation
] as const;

/** Transient error patterns - temporary issues that may resolve with retry */
export const TRANSIENT_PATTERNS = [
  'timeout',
  'econnrefused',
  'econnreset',
  'etimedout',
  ...RATE_LIMIT_PATTERNS,
  '503',
  '502',
  '529', // Anthropic HTTP 529 = service overloaded
  'network error',
  'stream closed without yielding content', // empty provider stream: silent rejection or interruption, not a node defect
  'socket hang up',
  'exited with code',
  'claude code crash',
];

/**
 * Check if error message matches any pattern in the list.
 */
export function matchesPattern(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

/**
 * Classify an error to determine if it's transient (can retry) or fatal (should fail).
 * Decisive FATAL patterns take priority over TRANSIENT patterns to prevent an error
 * containing both (e.g. "unauthorized: process exited with code 1") from being retried.
 * Ambiguous provider wrapper text such as "auth error" is fatal only when no concrete
 * transient signal matches.
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (matchesPattern(message, FATAL_PATTERNS)) {
    return 'FATAL';
  }
  if (matchesPattern(message, TRANSIENT_PATTERNS)) {
    return 'TRANSIENT';
  }
  if (matchesPattern(message, FALLBACK_FATAL_PATTERNS)) {
    return 'FATAL';
  }
  return 'UNKNOWN';
}

/** Retry budget for rate-limited failures, replacing the node's own maxRetries when one is seen. */
export const RATE_LIMIT_MAX_RETRIES = 5;

/** Flat delay center for rate-limit retries; jitter widens it to ±50% in {@link getRetryDelayMs}. */
export const RATE_LIMIT_RETRY_DELAY_MS = 45_000;

export function isRateLimitError(error: string): boolean {
  const message = error.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Delay before retry attempt N for a failed attempt with this error message.
 *
 * Rate-limit failures back off FLAT at ~45s ±50% jitter: providers shedding load
 * recover on a minutes-scale window with no retry-after signal, so exponential
 * from 3s either exhausts before the window opens or over-waits once it does; flat +
 * jitter spreads concurrent nodes apart without thundering-herd re-synchronization.
 * Everything else keeps the caller's base × 2^attempt exponential shape.
 */
export function getRetryDelayMs(errorMessage: string, attempt: number, baseDelayMs: number): number {
  if (isRateLimitError(errorMessage)) {
    return Math.round(RATE_LIMIT_RETRY_DELAY_MS * (0.5 + Math.random()));
  }
  return baseDelayMs * Math.pow(2, attempt);
}

// ─── Subprocess Failure Formatting ───────────────────────────────────────────

/** Max characters of combined stdout+stderr we keep in user-facing and logged fields. */
const SUBPROCESS_ERROR_MAX_CHARS = 2000;

function streamTail(text: string, max: number): string | undefined {
  if (text.length === 0) return undefined;
  return text.length > max ? text.slice(-max) : text;
}

/**
 * Raw ExecFileException shape from Node's `child_process.execFile`. For inline
 * scripts via `bash -c <body>` / `bun -e <body>` the entire script body is
 * embedded in `err.message`, `err.cmd`, and the first line of `err.stack` —
 * which is why `formatSubprocessFailure` strips the prefix and exposes a
 * controlled `logFields` subset rather than the raw error.
 */
interface RawSubprocessError {
  message?: string;
  stderr?: string;
  stdout?: string;
  // Numeric exit code OR errno symbol (e.g. 'ENOENT') — mirrors ExecFileException.
  code?: number | string | null;
  killed?: boolean;
  cmd?: string;
}

/**
 * Produce a concise, diagnostic-first summary of a failed subprocess.
 *
 * User-visible output strips Node's `"Command failed: <cmd>"` prefix (which for
 * inline scripts contains the full script body) and includes a jointly capped
 * tail of stderr and stdout — stderr keeps budget priority, stdout gets the
 * remainder, so scripts that report failure context on stdout stay visible.
 * Log fields expose a controlled, tail-truncated subset — never the full `err`
 * object, to prevent the default error serializer from emitting three copies
 * of the script body (`err.message`, `err.stack`, `err.cmd`).
 */
export function formatSubprocessFailure(
  error: RawSubprocessError,
  label: string,
): { userMessage: string; logFields: Record<string, unknown> } {
  const stderr = (error.stderr ?? '').trim();
  const stdout = (error.stdout ?? '').trim();
  const rawMessage = (error.message ?? '').trim();

  // The first line of Node's ExecFileException.message is `Command failed: <cmd>`,
  // and for `bash -c <body>` / `bun -e <body>` that line embeds the full script
  // body. Strip it so user-facing output never re-leaks the body.
  const hasCommandFailedPrefix = rawMessage.startsWith('Command failed:');
  const bodyAfterPrefix = hasCommandFailedPrefix ? rawMessage.split('\n').slice(1).join('\n').trim() : rawMessage;

  // Well-behaved scripts print failure context to stdout, so both streams share
  // the cap. stderr keeps budget priority; the leftover goes to stdout, and each
  // stream is labelled only when both are present. The budget accounts for the
  // label overhead so the joined diagnostic never truncates away a label.
  const STDERR_LABEL = '[stderr]\n';
  const STDOUT_LABEL = '\n[stdout]\n';
  const bothPresent = stderr.length > 0 && stdout.length > 0;
  const labelsOverhead = bothPresent ? STDERR_LABEL.length + STDOUT_LABEL.length : 0;
  const halfCap = Math.floor(SUBPROCESS_ERROR_MAX_CHARS / 2);
  const stderrTail = streamTail(stderr, bothPresent ? halfCap : SUBPROCESS_ERROR_MAX_CHARS);
  const stdoutTail = streamTail(stdout, SUBPROCESS_ERROR_MAX_CHARS - labelsOverhead - (stderrTail?.length ?? 0));

  let diagnostic: string;
  if (stderrTail && stdoutTail) {
    diagnostic = `${STDERR_LABEL}${stderrTail}${STDOUT_LABEL}${stdoutTail}`;
  } else if (stderrTail || stdoutTail) {
    diagnostic = (stderrTail ?? '') + (stdoutTail ?? '');
  } else if (bodyAfterPrefix) {
    diagnostic = bodyAfterPrefix;
  } else if (hasCommandFailedPrefix) {
    // Prefix was the entire message — exit code in the suffix is the only signal.
    diagnostic = 'no diagnostic output';
  } else {
    diagnostic = 'unknown error';
  }

  const truncated =
    diagnostic.length > SUBPROCESS_ERROR_MAX_CHARS
      ? diagnostic.slice(-SUBPROCESS_ERROR_MAX_CHARS) + '\n…[truncated]'
      : diagnostic;

  const exitSuffix = error.code == null ? '' : ` [exit ${String(error.code)}]`;

  return {
    userMessage: `${label} failed${exitSuffix}: ${truncated}`,
    logFields: {
      exitCode: error.code ?? undefined,
      killed: error.killed === true,
      stderrTail,
      stdoutTail,
    },
  };
}

// ─── Host error-family mapping (adaptation, not a port) ─────────────────────
//
// Archon's `classifyError` feeds its own retry loop; workflowbuilder has no
// per-node retry yet (v1 runs with a single attempt), so the classification
// instead needs to become one of the host's own error types so the graph
// runner can record permanent-vs-transient failures uniformly across executors.

/** Maps a `classifyError` verdict onto the host's `NodeExecutionError` family. */
export function toHostNodeExecutionError(
  errorType: ErrorType,
  code: string,
  message: string,
  options?: { cause?: unknown },
): NodeExecutionError {
  switch (errorType) {
    case 'FATAL': {
      return new PermanentNodeExecutionError(code, message, options);
    }
    case 'TRANSIENT': {
      return new TransientNodeExecutionError(code, message, options);
    }
    case 'UNKNOWN': {
      return new NodeExecutionError(code, message, options);
    }
  }
}

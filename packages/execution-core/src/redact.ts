import type { EventEmitterPort } from './ports/event-emitter.port';

// Write-time redaction for execution event payloads. Ships into Temporal's V8
// workflow sandbox (imported by graph-runner), so it must stay deterministic:
// no I/O, no clock, no random, no imports beyond types.
//
// Copy-on-write is load-bearing, not hygiene: the runner emits before handing
// the SAME config/context objects to the real executor, and the wave context is
// shared across sibling nodes — mutating here would feed '[REDACTED]' into
// execution itself.
//
// Matching is key-based only. Secrets arriving through VALUES (e.g. a resolved
// `{{variables.x}}` template) are not caught — that belongs to the variables
// feature (follow-up: value-based-redaction). Encrypting Temporal's own event
// history, where activity args land unredacted, is planned separately
// (follow-up: temporal-payload-codec).
export const REDACTED = '[REDACTED]';

const TRUNCATED = '[TRUNCATED]';

// Keys are matched after normalization (lowercase, `_`/`-` stripped). Short
// generic words use exact or suffix matching on purpose: plain substring
// 'token' would mask real LLM-config fields like maxTokens/tokenizer, and
// substring 'auth' would mask 'author'.
export const SENSITIVE_KEY_RULES: Record<'contains' | 'endsWith' | 'equals', readonly string[]> = {
  contains: [
    'apikey',
    'secret',
    'password',
    'passwd',
    'credential',
    'authorization',
    'accesskey',
    'privatekey',
    'connectionstring',
  ],
  endsWith: ['token'],
  equals: ['auth', 'bearer', 'cookie', 'setcookie', 'pwd'],
};

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll(/[-_]/g, '');
  return (
    SENSITIVE_KEY_RULES.contains.some((rule) => normalized.includes(rule)) ||
    SENSITIVE_KEY_RULES.endsWith.some((rule) => normalized.endsWith(rule)) ||
    SENSITIVE_KEY_RULES.equals.includes(normalized)
  );
}

// Depth cap per replay-audit rule 8: an unbounded walk over adapter-supplied
// data can hang the workflow and wedge every subsequent replay. The cap also
// terminates cyclic inputs from non-Temporal engines.
const MAX_DEPTH = 64;

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    return TRUNCATED;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = isSensitiveKey(key) ? REDACTED : redactValue(entry, depth + 1);
    }
    return copy;
  }
  return value;
}

export function redactSensitive(value: unknown): unknown {
  return redactValue(value, 0);
}

export function withRedactedPayloads(events: EventEmitterPort): EventEmitterPort {
  return {
    emitEvent: (executionId, type, payload, nodeId) =>
      events.emitEvent(executionId, type, redactSensitive(payload), nodeId),
    updateStatus: (executionId, status, errorMessage) => events.updateStatus(executionId, status, errorMessage),
  };
}

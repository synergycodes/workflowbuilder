// A duration Temporal accepts, e.g. '30s', '10m', '1h'. A narrow subset of the
// format its own `Duration` allows, which is enough for a timeout and keeps
// @temporalio/* out of the published type surface.
type DurationString = `${number}${'ms' | 's' | 'm' | 'h' | 'd'}`;

// Timeout and retry shape for a proxied activity.
//
// Deliberately our own type rather than Temporal's `ActivityOptions`: it keeps
// @temporalio/workflow out of the published type surface (it is an optional peer, so
// a client-only consumer may not have it installed), and it is the seam that
// per-node-type profiles plug into. Structurally compatible with `ActivityOptions`,
// so it can be handed straight to `proxyActivities`.
export type ActivityProfile = {
  startToCloseTimeout: DurationString;
  retry: { maximumAttempts: number };
};

// Runtime twin of DurationString, which is erased at compile time. A profile can
// reach us from JSON or an untyped consumer, so the shape is checked, not assumed.
const DURATION_PATTERN = /^\d+(?:ms|s|m|h|d)$/;

export function isDurationString(value: unknown): value is DurationString {
  return typeof value === 'string' && DURATION_PATTERN.test(value);
}

// Frozen, nested object included: these are shared singletons, and a caller that
// mutated one would change every node's retry cap for the rest of the process.
// Spreading them still works, which is the documented way to derive a profile.

// Node activities may call LLMs (minutes) — generous timeout, fewer retries to limit
// cost on partial failures.
export const DEFAULT_NODE_ACTIVITY_PROFILE: ActivityProfile = Object.freeze({
  startToCloseTimeout: '10m',
  retry: Object.freeze({ maximumAttempts: 2 }),
});

// DB activities: fast, idempotent INSERT/UPDATE — short timeout, aggressive retries.
export const DEFAULT_DATABASE_ACTIVITY_PROFILE: ActivityProfile = Object.freeze({
  startToCloseTimeout: '30s',
  retry: Object.freeze({ maximumAttempts: 5 }),
});

// Per-node-type overrides keyed by `node.type`; a type with no entry resolves to
// DEFAULT_NODE_ACTIVITY_PROFILE. Whole profiles, not partials: one that omitted
// `retry` would inherit Temporal's default of unlimited retries with backoff.
export type NodeActivityProfiles = Readonly<Record<string, ActivityProfile>>;

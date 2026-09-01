// A duration Temporal accepts, e.g. '30s', '10m', '1.5h'. Kept as our own type so
// @temporalio/* stays out of the published type surface.
//
// The template literal is looser than what is actually valid: `${number}` also admits
// '0s', '-5m' and '1e3s', none of which Temporal will schedule. `isDurationString`
// narrows it to a positive decimal followed by a unit, which is the grammar the error
// messages and the README describe.
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

// Decimals are allowed because Temporal's own parser takes them ('1.5h' is 90
// minutes). Zero is not: the server treats a zero timeout as unset and rejects the
// command, which wedges the workflow task in a retry loop instead of failing the run.
const DURATION_PATTERN = /^\d+(?:\.\d+)?(?:ms|s|m|h|d)$/;

export function isDurationString(value: unknown): value is DurationString {
  return typeof value === 'string' && DURATION_PATTERN.test(value) && Number.parseFloat(value) > 0;
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

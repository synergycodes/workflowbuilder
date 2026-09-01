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

// Node activities may call LLMs (minutes) — generous timeout, fewer retries to limit
// cost on partial failures.
export const DEFAULT_NODE_ACTIVITY_PROFILE: ActivityProfile = {
  startToCloseTimeout: '10m',
  retry: { maximumAttempts: 2 },
};

// DB activities: fast, idempotent INSERT/UPDATE — short timeout, aggressive retries.
export const DEFAULT_DATABASE_ACTIVITY_PROFILE: ActivityProfile = {
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 5 },
};

// Per-node-type overrides for the node activity, keyed by `node.type`. A type with
// no entry resolves to DEFAULT_NODE_ACTIVITY_PROFILE.
//
// Entries are complete profiles, not partials, on purpose. A partial would let a
// caller set a timeout and silently lose the retry cap, and the value Temporal falls
// back to is unlimited retries with backoff — an LLM node would then burn budget on
// a permanently failing call. Spread the default to change one field:
//
//   { 'my/slow-node': { ...DEFAULT_NODE_ACTIVITY_PROFILE, startToCloseTimeout: '30m' } }
export type NodeActivityProfiles = Readonly<Record<string, ActivityProfile>>;

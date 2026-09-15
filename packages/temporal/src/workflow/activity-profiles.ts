// Ours, so @temporalio/* stays out of the published types. Looser than the server
// accepts: `${number}` also admits '0s', '-5m' and '1e3s'. ./profile-validation narrows it.
export type DurationString = `${number}${'ms' | 's' | 'm' | 'h' | 'd'}`;

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
  // Routes this node type's activities to a non-default queue, e.g. a specialized
  // worker with its own image/tools. Absent means the plugin's own task queue.
  taskQueue?: string;
  // Detects a stalled/crashed worker faster than startToCloseTimeout alone: the activity
  // must call Context.current().heartbeat() more often than this or Temporal fails it early.
  // Absent means Temporal's own default (no heartbeat monitoring).
  heartbeatTimeout?: DurationString;
};

// Only for the two frozen singletons below. Annotating them `ActivityProfile` would
// erase the readonly modifiers, so a consumer tuning a default in place would compile
// and then throw inside the sandbox on first activation.
type ReadonlyActivityProfile = {
  readonly startToCloseTimeout: DurationString;
  readonly retry: { readonly maximumAttempts: number };
  readonly taskQueue?: string;
  readonly heartbeatTimeout?: DurationString;
};

// Node activities may call LLMs (minutes) — generous timeout, fewer retries to limit
// cost on partial failures.
export const DEFAULT_NODE_ACTIVITY_PROFILE: ReadonlyActivityProfile = Object.freeze({
  startToCloseTimeout: '10m',
  retry: Object.freeze({ maximumAttempts: 2 }),
});

// DB activities: fast, idempotent INSERT/UPDATE — short timeout, aggressive retries.
export const DEFAULT_DATABASE_ACTIVITY_PROFILE: ReadonlyActivityProfile = Object.freeze({
  startToCloseTimeout: '30s',
  retry: Object.freeze({ maximumAttempts: 5 }),
});

// Keyed by `node.type`; no entry means DEFAULT_NODE_ACTIVITY_PROFILE. Whole profiles,
// not partials: omitting `retry` would inherit Temporal's unlimited-retry default.
export type NodeActivityProfiles = Readonly<Record<string, ActivityProfile>>;

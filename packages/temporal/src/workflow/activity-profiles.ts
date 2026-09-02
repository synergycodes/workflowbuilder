// Ours, so @temporalio/* stays out of the published types. Looser than the server
// accepts: `${number}` also admits '0s', '-5m' and '1e3s'. `isDurationString` narrows it.
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

// Temporal parses decimals ('1.5h' is 90 minutes). Zero it treats as unset and rejects
// the command, wedging the workflow task in a retry loop rather than failing the run.
const DURATION_PATTERN = /^\d+(?:\.\d+)?(?:ms|s|m|h|d)$/;

export function isDurationString(value: unknown): value is DurationString {
  return typeof value === 'string' && DURATION_PATTERN.test(value) && Number.parseFloat(value) > 0;
}

// Node activities may call LLMs (minutes) — generous timeout, fewer retries to limit
// cost on partial failures. Both profiles are frozen down to `retry`, because mutating
// a shared singleton would change every node's cap.
export const DEFAULT_NODE_ACTIVITY_PROFILE: ActivityProfile = Object.freeze({
  startToCloseTimeout: '10m',
  retry: Object.freeze({ maximumAttempts: 2 }),
});

// DB activities: fast, idempotent INSERT/UPDATE — short timeout, aggressive retries.
export const DEFAULT_DATABASE_ACTIVITY_PROFILE: ActivityProfile = Object.freeze({
  startToCloseTimeout: '30s',
  retry: Object.freeze({ maximumAttempts: 5 }),
});

// Keyed by `node.type`; no entry means DEFAULT_NODE_ACTIVITY_PROFILE. Whole profiles,
// not partials: omitting `retry` would inherit Temporal's unlimited-retry default.
export type NodeActivityProfiles = Readonly<Record<string, ActivityProfile>>;

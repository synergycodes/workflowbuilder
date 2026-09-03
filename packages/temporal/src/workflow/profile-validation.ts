// The one boundary that decides whether a nodeActivityProfiles map is usable. What it
// deliberately does not check is in the README under "What the profile check covers".
// (follow-up: temporal-profile-wire-validation)
import type { ActivityProfile, DurationString, NodeActivityProfiles } from './activity-profiles';

// Temporal parses decimals ('1.5h' is 90 minutes).
const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/;
const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

// The range a protobuf Duration carries. Under one nanosecond it rounds to zero, which
// the server treats as unset and refuses; over the ceiling `parseFloat` reaches Infinity.
const MIN_DURATION_MS = 0.000_001;
const MAX_DURATION_MS = 315_576_000_000 * UNIT_MS.s;

// The proto field is int32 and wraps above this. 4294967296 arrives as 0, which
// Temporal reads as unlimited retries.
const MAX_RETRY_ATTEMPTS = 2_147_483_647;

function isDurationString(value: unknown): value is DurationString {
  if (typeof value !== 'string') return false;
  const match = DURATION_PATTERN.exec(value);
  if (match === null) return false;

  const milliseconds = Number.parseFloat(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
  // Written so NaN and Infinity fall outside rather than through.
  return milliseconds >= MIN_DURATION_MS && milliseconds <= MAX_DURATION_MS;
}

function assertActivityProfile(nodeType: string, profile: ActivityProfile | undefined): void {
  const path = `nodeActivityProfiles[${JSON.stringify(nodeType)}]`;

  if (!isDurationString(profile?.startToCloseTimeout)) {
    throw new TypeError(
      `${path}.startToCloseTimeout must be a number followed by ms, s, m, h or d, such as '30s', '10m' or '1.5h', and must fit a protobuf Duration: no shorter than one nanosecond ('0.000001ms') and no longer than '3652500d'. Values the TypeScript type admits but Temporal cannot schedule, such as '0s', '-5m' and '1e3s', are rejected here. Got ${JSON.stringify(profile?.startToCloseTimeout)}.`,
    );
  }

  const attempts = profile.retry?.maximumAttempts;
  if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1 || attempts > MAX_RETRY_ATTEMPTS) {
    throw new TypeError(
      `${path}.retry.maximumAttempts must be a positive integer no greater than ${MAX_RETRY_ATTEMPTS}, got ${JSON.stringify(attempts)}.`,
    );
  }
}

// Checked per map, not per node: a profile that only fails once a node is scheduled
// reaches the graph's errorPolicy, which can absorb it into a completed run.
export function assertNodeActivityProfiles(profiles: NodeActivityProfiles): void {
  for (const [nodeType, profile] of Object.entries(profiles)) {
    assertActivityProfile(nodeType, profile);
  }
}

// Validated snapshot. Without the copy, a map filled in or edited after
// `createRunWorkflow` would reach the resolver unchecked.
export function freezeNodeActivityProfiles(profiles: NodeActivityProfiles): NodeActivityProfiles {
  assertNodeActivityProfiles(profiles);

  const entries = Object.entries(profiles).map(([nodeType, profile]): [string, ActivityProfile] => [
    nodeType,
    Object.freeze({ ...profile, retry: Object.freeze({ ...profile.retry }) }),
  ]);
  return Object.freeze(Object.fromEntries(entries));
}

// The one config mistake the sandbox cannot see, since the workflow has no registry.
// Returned rather than thrown: one bundle may serve workers registering different subsets.
export function findProfilesWithoutExecutor(profiles: NodeActivityProfiles, executors: object): string[] {
  return Object.keys(profiles).filter((nodeType) => !Object.hasOwn(executors, nodeType));
}

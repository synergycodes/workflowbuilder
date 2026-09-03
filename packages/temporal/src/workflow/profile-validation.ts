// The one boundary that decides whether a nodeActivityProfiles map is usable, and the
// place to extend when that needs to go deeper. What it deliberately does not check,
// and why, is in the README under "What the profile check covers".
// (follow-up: temporal-profile-wire-validation)
import type { ActivityProfile, DurationString, NodeActivityProfiles } from './activity-profiles';

// Temporal parses decimals ('1.5h' is 90 minutes). Zero it treats as unset and rejects
// the command, wedging the workflow task in a retry loop rather than failing the run.
const DURATION_PATTERN = /^\d+(?:\.\d+)?(?:ms|s|m|h|d)$/;

// The proto field is int32 and wraps above this. 4294967296 arrives as 0, which
// Temporal reads as unlimited retries.
const MAX_RETRY_ATTEMPTS = 2_147_483_647;

function isDurationString(value: unknown): value is DurationString {
  return typeof value === 'string' && DURATION_PATTERN.test(value) && Number.parseFloat(value) > 0;
}

function assertActivityProfile(nodeType: string, profile: ActivityProfile | undefined): void {
  const path = `nodeActivityProfiles[${JSON.stringify(nodeType)}]`;

  if (!isDurationString(profile?.startToCloseTimeout)) {
    throw new TypeError(
      `${path}.startToCloseTimeout must be a positive number followed by ms, s, m, h or d, such as '30s', '10m' or '1.5h'. Zero, negative and exponent notation are rejected. Got ${JSON.stringify(profile?.startToCloseTimeout)}.`,
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

// Pure and Temporal-free, so these checks run in worker setup as well as inside the
// workflow sandbox. The README says which call site catches what.
import {
  type ActivityProfile,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
  isDurationString,
} from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

// The Summary is copied into every ActivityTaskScheduled event, and the server carries
// a 400-byte limit it does not enforce on this path yet.
// (follow-up: summary-size-server-limit)
const MAX_SUMMARY_LENGTH = 200;

// One entry. Shared so the resolver and the map-wide assert cannot word the same
// problem differently.
function assertActivityProfile(nodeType: string, profile: ActivityProfile | undefined): void {
  const path = `nodeActivityProfiles[${JSON.stringify(nodeType)}]`;

  if (!isDurationString(profile?.startToCloseTimeout)) {
    throw new TypeError(
      `${path}.startToCloseTimeout must be a positive number followed by ms, s, m, h or d, such as '30s', '10m' or '1.5h'. Zero, negative and exponent notation are rejected. Got ${JSON.stringify(profile?.startToCloseTimeout)}.`,
    );
  }

  const attempts = profile.retry?.maximumAttempts;
  if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError(`${path}.retry.maximumAttempts must be a positive integer, got ${JSON.stringify(attempts)}.`);
  }
}

// Checked once per map, never per node: a profile that only fails when a node is
// scheduled reaches the graph's errorPolicy, which can absorb it into a run that closes
// as completed. See the README for where to call this from.
export function assertNodeActivityProfiles(profiles: NodeActivityProfiles): void {
  for (const [nodeType, profile] of Object.entries(profiles)) {
    assertActivityProfile(nodeType, profile);
  }
}

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  let profile = DEFAULT_NODE_ACTIVITY_PROFILE;

  // `Object.hasOwn`, not a plain lookup: node types are author-supplied, so one named
  // `constructor` would otherwise resolve off Object.prototype.
  if (Object.hasOwn(profiles, node.type)) {
    profile = profiles[node.type];
    // Same message the map-wide assert gives. Without it, an entry whose value is
    // undefined throws a bare property-access error naming neither type nor rule.
    assertActivityProfile(node.type, profile);
  }

  // `retry` copied too: a shallow spread would hand the caller the shared default's
  // nested object.
  const options: NodeActivityOptions = { ...profile, retry: { ...profile.retry } };

  // Trimmed and clamped here rather than trusted from the caller, because any consumer
  // can build the workflow input. A blank Summary renders as nothing, where no Summary
  // falls back to the activity type.
  const label = typeof node.label === 'string' ? node.label.trim() : '';
  const summary = label.slice(0, MAX_SUMMARY_LENGTH);

  // Omitted, not `summary: undefined`: that is a different command payload.
  return summary === '' ? options : { ...options, summary };
}

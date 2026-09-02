// Pure, so it also runs in worker setup outside the sandbox. See the README.
import {
  type ActivityProfile,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
  isDurationString,
} from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

// The Summary is copied into every ActivityTaskScheduled event, and the server has an
// unenforced 400-byte cap. (follow-up: summary-size-server-limit)
const MAX_SUMMARY_LENGTH = 200;

// Shared with the map-wide assert so the two cannot word the same problem differently.
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

// Checked per map, not per node: a profile that only fails once a node is scheduled
// reaches the graph's errorPolicy, which can absorb it into a completed run.
export function assertNodeActivityProfiles(profiles: NodeActivityProfiles): void {
  for (const [nodeType, profile] of Object.entries(profiles)) {
    assertActivityProfile(nodeType, profile);
  }
}

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  let profile = DEFAULT_NODE_ACTIVITY_PROFILE;

  // hasOwn: a node type named `constructor` would resolve off Object.prototype.
  if (Object.hasOwn(profiles, node.type)) {
    profile = profiles[node.type];
    // Otherwise an entry holding undefined throws naming neither type nor rule.
    assertActivityProfile(node.type, profile);
  }

  // `retry` too: a shallow spread would share the default's nested object.
  const options: NodeActivityOptions = { ...profile, retry: { ...profile.retry } };

  // Not trusted from the caller: any consumer can build the workflow input.
  const label = typeof node.label === 'string' ? node.label.trim() : '';
  const summary = label.slice(0, MAX_SUMMARY_LENGTH);

  // A blank Summary renders as nothing; an absent key falls back to the activity type.
  return summary === '' ? options : { ...options, summary };
}

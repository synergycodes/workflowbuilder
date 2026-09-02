// Pure, so it also runs in worker setup outside the sandbox. See the README.
import {
  type ActivityProfile,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
  isDurationString,
} from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

// The Summary is copied into every ActivityTaskScheduled event, and the server caps the
// serialized payload at 400 bytes (limit.userMetadataSummarySize, unenforced today).
// The margin covers JSON quoting. (follow-up: summary-size-server-limit)
const MAX_SUMMARY_BYTES = 380;

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

// Code points, not code units: a UTF-16 slice can split a surrogate pair, and the cap
// counts bytes. TextEncoder is injected into the workflow sandbox by the worker.
function clampToSummaryBytes(text: string): string {
  const encoder = new TextEncoder();
  let bytes = 0;
  let clamped = '';

  for (const codePoint of text) {
    const size = encoder.encode(codePoint).length;
    if (bytes + size > MAX_SUMMARY_BYTES) break;
    bytes += size;
    clamped += codePoint;
  }

  return clamped;
}

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  // hasOwn: a node type named `constructor` would resolve off Object.prototype.
  const profile = Object.hasOwn(profiles, node.type) ? profiles[node.type] : DEFAULT_NODE_ACTIVITY_PROFILE;

  // `retry` too: a shallow spread would share the frozen default's nested object.
  const options: NodeActivityOptions = { ...profile, retry: { ...profile.retry } };

  // Not trusted from the caller: any consumer can build the workflow input. Temporal
  // renders the Summary as single-line markdown, so newlines collapse.
  const label = typeof node.label === 'string' ? node.label : '';
  const summary = clampToSummaryBytes(label.replaceAll(/\s+/g, ' ').trim()).trimEnd();

  // A blank Summary renders as nothing; an absent key falls back to the activity type.
  return summary === '' ? options : { ...options, summary };
}

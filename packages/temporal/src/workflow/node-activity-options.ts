// Pure, so it also runs in worker setup outside the sandbox. See the README.
import { type ActivityProfile, DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';
import { assertNodeActivityProfiles } from './profile-validation';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

const encoder = new TextEncoder();

// Copied into every ActivityTaskScheduled event, so it stays bounded. Bounds the raw
// string, not the serialized payload the server's cap measures; see the README.
// (follow-up: temporal-profile-wire-validation)
const MAX_SUMMARY_BYTES = 300;

// Code points, not code units: a UTF-16 slice can split a surrogate pair, and the cap
// counts bytes. TextEncoder is injected into the workflow sandbox by the worker.
function clampToSummaryBytes(text: string): string {
  // The common path. The loop below encodes per code point, so it costs far more.
  if (encoder.encode(text).length <= MAX_SUMMARY_BYTES) return text;

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

// Takes the snapshot `createRunWorkflow` already validated and froze, so it re-checks
// nothing: a throw here would land inside executeNode, the one place the graph's
// errorPolicy can absorb it into a completed run.
export function resolveFromValidatedProfiles(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  // hasOwn: a node type named `constructor` would resolve off Object.prototype.
  const profile = Object.hasOwn(profiles, node.type) ? profiles[node.type] : DEFAULT_NODE_ACTIVITY_PROFILE;

  const options: NodeActivityOptions = {
    startToCloseTimeout: profile.startToCloseTimeout,
    retry: { maximumAttempts: profile.retry.maximumAttempts },
  };

  // Not trusted from the caller: any consumer can build the workflow input. Temporal
  // renders the Summary as single-line markdown, so newlines collapse.
  const label = typeof node.label === 'string' ? node.label : '';
  const summary = clampToSummaryBytes(label.replaceAll(/\s+/g, ' ').trim()).trimEnd();

  // A blank Summary renders as nothing; an absent key falls back to the activity type.
  return summary === '' ? options : { ...options, summary };
}

// The exported form, for checking a map without reading it back out of Event History.
// Validates it here so a bad entry names itself, and so the message cannot drift from
// the one a worker sees.
export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  assertNodeActivityProfiles(profiles);
  return resolveFromValidatedProfiles(node, profiles);
}

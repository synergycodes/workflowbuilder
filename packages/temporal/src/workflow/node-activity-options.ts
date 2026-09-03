// Pure, so it also runs in worker setup outside the sandbox. See the README.
import { type ActivityProfile, DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

// The Summary is copied into every ActivityTaskScheduled event, so it stays bounded.
// Comfortably under the server's 400-byte cap on the serialized payload, whose exact
// arithmetic a custom payload converter or codec changes anyway.
// (follow-up: temporal-profile-wire-validation)
const MAX_SUMMARY_BYTES = 300;

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

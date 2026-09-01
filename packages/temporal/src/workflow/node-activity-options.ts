// How one node's activity gets scheduled: its timeout, its retry cap, and the
// Summary that Temporal UI shows for the row.
//
// Kept as a pure function rather than inlined into the workflow so it can be tested
// without a Temporal environment. Two properties are worth pinning by test and are
// the reason this file exists at all:
//
//   - a node type with no profile resolves to exactly the old blanket values, never
//     to Temporal's own default of unlimited retries with backoff;
//   - the resolution reads only the node and the profiles map, so it is deterministic
//     and safe to call from inside the workflow sandbox.
//
// Sandbox-safe: no Temporal imports, no clock, no random, no I/O.
import { type ActivityProfile, DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';

// An ActivityProfile plus the per-call Summary. Structurally a subset of Temporal's
// `ActivityOptions`, so it can be handed straight to `proxyActivities` — the same
// reason ActivityProfile is shaped the way it is.
export type NodeActivityOptions = ActivityProfile & { summary?: string };

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  // `Object.hasOwn` rather than a plain lookup: node types are author-supplied
  // strings, so a type named `constructor` or `toString` would otherwise resolve to
  // something off Object.prototype and be handed to Temporal as activity options.
  const profile = Object.hasOwn(profiles, node.type)
    ? (profiles[node.type] ?? DEFAULT_NODE_ACTIVITY_PROFILE)
    : DEFAULT_NODE_ACTIVITY_PROFILE;

  // Omitted rather than set to undefined: Temporal serialises the options it is
  // given, and an explicit `summary: undefined` is not the same command payload as
  // no summary at all.
  return node.label === undefined ? { ...profile } : { ...profile, summary: node.label };
}

// Pure and Temporal-free, so the fallback below can be tested without an
// environment and the call stays safe inside the workflow sandbox.
import { type ActivityProfile, DEFAULT_NODE_ACTIVITY_PROFILE, type NodeActivityProfiles } from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  // `Object.hasOwn`, not a plain lookup: node types are author-supplied, so one
  // named `constructor` would otherwise resolve off Object.prototype.
  const profile = Object.hasOwn(profiles, node.type)
    ? (profiles[node.type] ?? DEFAULT_NODE_ACTIVITY_PROFILE)
    : DEFAULT_NODE_ACTIVITY_PROFILE;

  // Omitted, not `summary: undefined`: that is a different command payload.
  return node.label === undefined ? { ...profile } : { ...profile, summary: node.label };
}

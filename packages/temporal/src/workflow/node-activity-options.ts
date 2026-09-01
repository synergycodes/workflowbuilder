// Pure and Temporal-free, so the fallback below can be tested without an
// environment and the call stays safe inside the workflow sandbox.
import {
  type ActivityProfile,
  DEFAULT_NODE_ACTIVITY_PROFILE,
  type NodeActivityProfiles,
  isDurationString,
} from './activity-profiles';
import type { BaseNode } from './core-contract';

export type NodeActivityOptions = ActivityProfile & { summary?: string };

// Called once per workflow build, never per node. A malformed profile discovered at
// scheduling time surfaces as a failing node, which the graph's errorPolicy can absorb
// into a run that closes as completed.
//
// Call it from worker setup too. `createRunWorkflow` runs inside the sandbox on first
// activation, so on its own it turns a bad profile into a workflow-task retry loop
// rather than a failed deploy.
//
// Temporal's own check only asks that some timeout is set, so the duration format and
// the retry cap are checked here.
export function assertNodeActivityProfiles(profiles: NodeActivityProfiles): void {
  for (const [nodeType, profile] of Object.entries(profiles)) {
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
}

export function resolveNodeActivityOptions(node: BaseNode, profiles: NodeActivityProfiles): NodeActivityOptions {
  // `Object.hasOwn`, not a plain lookup: node types are author-supplied, so one
  // named `constructor` would otherwise resolve off Object.prototype. An entry whose
  // value is undefined is not defaulted away here, because assertNodeActivityProfiles
  // rejects it — defaulting would make this function disagree with the validation a
  // consumer runs over the same map.
  const profile = Object.hasOwn(profiles, node.type) ? profiles[node.type] : DEFAULT_NODE_ACTIVITY_PROFILE;

  // `retry` copied too: a shallow spread would hand the caller the shared default's
  // nested object.
  const options: NodeActivityOptions = { ...profile, retry: { ...profile.retry } };

  // Trimmed here rather than trusted from the caller, because any consumer can build
  // the workflow input. A blank Summary renders as nothing, where no Summary falls
  // back to the activity type.
  const summary = typeof node.label === 'string' ? node.label.trim() : '';

  // Omitted, not `summary: undefined`: that is a different command payload.
  return summary === '' ? options : { ...options, summary };
}

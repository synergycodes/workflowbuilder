// Sandbox-safe entry point. Everything reachable from here is bundled into
// Temporal's V8 workflow sandbox, so nothing in this subtree may touch Node
// built-ins, @temporalio/worker or @temporalio/client (enforced by an ESLint rule
// and by the bundling test).
//
// Consumers re-export `runWorkflow` from their own workflows module — the
// TypeScript SDK bundles workflow code from a single module, so a plugin cannot
// register it on their behalf.

export { createRunWorkflow, runWorkflow } from './run-workflow';
export type { RunWorkflowOptions } from './run-workflow';

export { createSequencedEventEmitter } from './sequenced-event-emitter';
export type { EventPersistence } from './sequenced-event-emitter';

export type { Activities } from './activities-interface';

export { DEFAULT_DATABASE_ACTIVITY_PROFILE, DEFAULT_NODE_ACTIVITY_PROFILE } from './activity-profiles';
export type { ActivityProfile, NodeActivityProfiles } from './activity-profiles';

// `assertNodeActivityProfiles` is exported so a consumer can run it in their worker
// setup, outside the sandbox. `createRunWorkflow` also calls it, but that runs on
// first workflow activation, which is too late to fail a deploy. See the README.
export { assertNodeActivityProfiles, resolveNodeActivityOptions } from './node-activity-options';
export type { NodeActivityOptions } from './node-activity-options';

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

// Exported so a consumer can unit-test their own profile map against the same
// resolution the workflow uses, rather than asserting on Temporal history.
export { resolveNodeActivityOptions } from './node-activity-options';
export type { NodeActivityOptions } from './node-activity-options';

// The workflow module this worker hands to Temporal's bundler.
//
// The re-export is required rather than stylistic: the TypeScript SDK builds the
// workflow bundle from a single module, so a plugin cannot register a workflow on
// our behalf. Anything this worker should run as a workflow has to be exported here.
export { runWorkflow } from '@workflowbuilder/temporal/workflow';

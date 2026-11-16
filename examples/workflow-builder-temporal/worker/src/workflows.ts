// Temporal compiles the workflow bundle from this one module, so a plugin cannot register a
// workflow on your behalf. Re-exporting it is how the bundle picks it up.
export { runWorkflow } from '@workflowbuilder/temporal/workflow';

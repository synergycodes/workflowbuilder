// Stands in for a consumer's workflows module. This one line is the whole re-export
// pattern the README documents, and the bundling test proves it survives Temporal's
// own bundler.
export { runWorkflow } from '../../src/workflow/index';

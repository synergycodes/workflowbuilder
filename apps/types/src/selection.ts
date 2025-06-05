import { WorkflowBuilderEdge, WorkflowBuilderNode } from './node-data';

export type Selection = {
  node: WorkflowBuilderNode | null;
  edge: WorkflowBuilderEdge | null;
};

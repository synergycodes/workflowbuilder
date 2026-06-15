import type {
  WorkflowBuilderIsValidConnection,
  WorkflowBuilderReactFlowProps,
} from '../workflow-builder-root/workflow-builder-root.types';

// Holders for the React Flow config that flows from `<WorkflowBuilder.Root>` to
// `<WorkflowBuilder.Canvas>` (same pattern as `data/edge-templates.ts`). Not in
// the store: this is render config, not diagram state, so it must survive
// `resetWorkflowStore()`.

const EMPTY_PROPS: Readonly<WorkflowBuilderReactFlowProps> = Object.freeze({});

let isValidConnection: WorkflowBuilderIsValidConnection | null = null;
let reactFlowProps: WorkflowBuilderReactFlowProps = EMPTY_PROPS;

export function setIsValidConnection(fn: WorkflowBuilderIsValidConnection | null): void {
  isValidConnection = fn;
}

export function getIsValidConnection(): WorkflowBuilderIsValidConnection | null {
  return isValidConnection;
}

export function setReactFlowProps(props: WorkflowBuilderReactFlowProps | null): void {
  // Falls back to the same frozen object so `useReactFlowProps()` keeps a stable
  // reference when unset.
  reactFlowProps = props ?? EMPTY_PROPS;
}

export function getReactFlowProps(): WorkflowBuilderReactFlowProps {
  return reactFlowProps;
}

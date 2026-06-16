import type {
  WorkflowBuilderIsValidConnection,
  WorkflowBuilderReactFlowProps,
} from '../workflow-builder-root/workflow-builder-root.types';

// React Flow config passed to `<WorkflowBuilder.Root>`, read by the canvas. Kept
// out of the store so it survives `resetWorkflowStore()` (same pattern as
// `data/edge-templates.ts`).

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
  // Reuse the frozen object so the reference stays stable when unset.
  reactFlowProps = props ?? EMPTY_PROPS;
}

export function getReactFlowProps(): WorkflowBuilderReactFlowProps {
  return reactFlowProps;
}

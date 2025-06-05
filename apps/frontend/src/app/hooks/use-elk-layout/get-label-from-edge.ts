import { WorkflowBuilderEdge } from '@workflow-builder/types/node-data';

type ElkLabel = {
  width: number;
  height: number;
  text: string;
};

export function getLabelFromEdge(edge: WorkflowBuilderEdge): ElkLabel | null {
  const label = document.querySelector(`[data-labeledgeid="${edge.id}"]`);

  return label
    ? {
        width: label.clientWidth,
        height: label.clientHeight,
        text: label.textContent ?? '',
      }
    : null;
}

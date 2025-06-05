import { getPortsFromEdges } from './get-ports-from-edges';
import { partition } from 'remeda';
import { mapPositionToSide } from './map-position-to-side';
import ELK, { ElkNode } from 'elkjs';
import { getLabelFromEdge } from './get-label-from-edge';
import { LayoutDirection } from '@workflow-builder/types/common';
import { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflow-builder/types/node-data';
import { SNAP_GRID, SNAP_IS_ACTIVE } from '@/features/diagram/diagram.const';
import { snapToGridIfNeeded } from '@/utils/position-utils';
import { getHandleType } from '@/features/diagram/handles/get-handle-type';

// elk layouting options can be found here:
// https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-layered.html

const elk = new ELK();

// 15rem -> 240px when this function was written
const nodeFallbackWidth = 240;

function getNodeWidth() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const widthRem = computedStyle.getPropertyValue('--ax-public-node-width').trim();

  if (widthRem.endsWith('rem')) {
    const remValue = Number.parseFloat(widthRem);
    const fontSize = Number.parseFloat(computedStyle.fontSize); // usually 1rem = 16px
    const widthPx = remValue * fontSize;

    return widthPx;
  }

  // If it's already in px, or another unit, try parsing directly
  const parsedValue = Number.parseFloat(widthRem);

  return Number.isNaN(parsedValue) ? nodeFallbackWidth : parsedValue;
}

export async function getLayoutedNodes(
  nodes: WorkflowBuilderNode[],
  edges: WorkflowBuilderEdge[],
  direction: LayoutDirection = 'RIGHT',
) {
  // Multiply by 2 to guarantee that after snapping to the grid, they do not meet at the same point
  const elkSpacingNodeNode = SNAP_IS_ACTIVE ? getNodeWidth() + 2 * Math.max(0, ...(SNAP_GRID || [])) : getNodeWidth();

  const layoutOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': direction,
    'elk.spacing.nodeNode': `${elkSpacingNodeNode}`,
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
    'elk.layered.spacing.edgeNodeBetweenLayers': '30',
  };

  const ports = getPortsFromEdges(edges, direction);
  const graph: ElkNode = {
    id: 'root',
    layoutOptions,
    children: nodes.map((node) => {
      const [targetPorts, sourcePorts] = partition(
        ports.filter(({ nodeId }) => nodeId === node.id),
        ({ position }) => getHandleType(position) === 'target',
      );
      const nodePorts = [...targetPorts, ...sourcePorts].map(({ id, position }) => ({
        id,
        properties: {
          side: mapPositionToSide(position),
        },
      }));

      return {
        id: node.id,
        width: node.width ?? 250,
        height: document.querySelector(`[data-id="${node.id}"]`)?.getBoundingClientRect().height ?? 50,
        properties: {
          'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
        },
        ports: [{ id: node.id }, ...nodePorts],
      };
    }),
    edges: edges.map((edge) => {
      const sourcePort = ports.find(({ nodeId, handle }) => edge.source === nodeId && edge.sourceHandle === handle);
      const targetPort = ports.find(({ nodeId, handle }) => edge.target === nodeId && edge.targetHandle === handle);
      return {
        id: edge.id,
        sources: [sourcePort?.id || edge.source],
        targets: [targetPort?.id || edge.target],
        labels: [getLabelFromEdge(edge) || { text: 'PLACEHOLDER' }],
      };
    }),
  };

  const layoutedGraph = await elk.layout(graph);

  return nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((lgNode) => lgNode.id === node.id);

    return {
      ...node,
      position: snapToGridIfNeeded(layoutedNode),
    };
  });
}

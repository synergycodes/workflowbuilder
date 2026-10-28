import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '@workflowbuilder/sdk';

export const initialNodes: WorkflowBuilderNode[] = [
  {
    id: 'trigger-1',
    type: 'node',
    position: { x: 80, y: 176 },
    data: {
      type: 'trigger',
      icon: 'Lightning',
      properties: {
        label: 'New request',
        description: 'Workflow entry point',
        status: 'active',
      },
    },
  },
  {
    id: 'action-1',
    type: 'node',
    position: { x: 440, y: 176 },
    data: {
      type: 'action',
      icon: 'PlayCircle',
      properties: {
        label: 'Send email',
        description: 'Notify the customer',
        status: 'active',
        message: 'Thanks for reaching out - we are on it!',
      },
    },
  },
  {
    id: 'condition-1',
    type: 'node',
    position: { x: 800, y: 176 },
    data: {
      type: 'condition',
      icon: 'Faders',
      properties: {
        label: 'Needs review?',
        description: 'Checks the amount',
        status: 'active',
        condition: 'amount > 100',
      },
    },
  },
];

export const initialEdges: WorkflowBuilderEdge[] = [
  {
    id: 'edge-trigger-action',
    source: 'trigger-1',
    sourceHandle: 'source',
    target: 'action-1',
    targetHandle: 'target',
    type: 'labelEdge',
  },
  {
    id: 'edge-action-condition',
    source: 'action-1',
    sourceHandle: 'source',
    target: 'condition-1',
    targetHandle: 'target',
    type: 'labelEdge',
  },
];

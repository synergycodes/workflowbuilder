import { WorkflowBuilderNode } from '@workflow-builder/types/node-data';

export const mockNodeDelay: WorkflowBuilderNode = {
  id: 'delay-1',
  type: 'node',
  position: {
    x: 0,
    y: 0,
  },
  data: {
    segments: [],
    properties: {
      label: 'Delay',
      description: 'Pause the workflow',
      status: 'draft',
      duration: {
        timeUnits: 'none',
        delayAmount: 3,
        maxWaitTime: '24',
        expression: 'order.processing_time * 2',
      },
      errors: [],
      type: 'fixedDelay',
    },
    type: 'delay',
    icon: 'Timer',
  },
  selected: false,
  measured: {
    width: 258,
    height: 63,
  },
  dragging: false,
};

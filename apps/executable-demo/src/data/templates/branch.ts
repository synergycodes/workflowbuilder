import type { TemplateModel } from '@workflowbuilder/sdk';

import { executableDiagram, executableEdge, executableNode } from './helpers';

const nodes = [
  executableNode({
    id: 'branch-trigger',
    type: 'trigger',
    label: 'Manual trigger',
    description: 'Try {"score":80,"tier":"pro"}.',
    icon: 'Lightning',
    x: 0,
    y: 250,
  }),
  executableNode({
    id: 'branch-condition',
    type: 'conditional',
    label: 'High score?',
    description: 'Routes score >= 70.',
    icon: 'ListChecks',
    x: 360,
    y: 250,
    properties: {
      conditionsArray: [{ x: '{{trigger.score}}', comparisonOperator: 'isGreaterThanOrEqual', y: '70' }],
    },
  }),
  executableNode({
    id: 'branch-decision',
    type: 'decision',
    label: 'Route tier',
    description: 'Pro tier gets a dedicated route.',
    icon: 'ArrowsSplit',
    x: 720,
    y: 50,
    properties: {
      decisionBranches: [
        {
          id: 'branch-pro',
          sourceHandle: 'source:inner:pro',
          label: 'Pro',
          conditions: [{ x: '{{trigger.tier}}', comparisonOperator: 'isEqual', y: 'pro' }],
        },
      ],
    },
  }),
  executableNode({
    id: 'branch-low',
    type: 'notification',
    label: 'Low score',
    description: 'Simulates a follow-up notice.',
    icon: 'PaperPlaneRight',
    x: 720,
    y: 450,
    properties: { type: 'push', recipient: 'demo-user', message: 'Follow-up recommended.' },
  }),
  executableNode({
    id: 'branch-pro-action',
    type: 'action',
    label: 'Pro route',
    description: 'Simulates a priority handoff.',
    icon: 'PlayCircle',
    x: 1080,
    y: 0,
    properties: { type: 'handoff' },
  }),
  executableNode({
    id: 'branch-default-action',
    type: 'action',
    label: 'Default route',
    description: 'Handles every other tier.',
    icon: 'PlayCircle',
    x: 1080,
    y: 200,
    properties: { type: 'task' },
  }),
];

const edges = [
  executableEdge('branch-edge-start-condition', 'branch-trigger', 'branch-condition'),
  executableEdge('branch-edge-condition-true', 'branch-condition', 'branch-decision', 'true', 'True'),
  executableEdge('branch-edge-condition-false', 'branch-condition', 'branch-low', 'false', 'False'),
  executableEdge('branch-edge-decision-pro', 'branch-decision', 'branch-pro-action', 'source:inner:pro', 'Pro'),
  executableEdge('branch-edge-decision-default', 'branch-decision', 'branch-default-action', 'default', 'Default'),
];

export const branchTemplate: TemplateModel = {
  id: 4202,
  name: 'Conditional and default branches',
  icon: 'ArrowsSplit',
  value: executableDiagram('Conditional and default branches', nodes, edges),
};

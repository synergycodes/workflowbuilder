import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DiagramSnapshot } from './protocol';
import { snapshotToDefinition } from './to-definition';

const snapshot: DiagramSnapshot = {
  nodes: [
    { id: 'trigger-1', data: { type: 'trigger', properties: { label: ' New request ', description: 'Entry point' } } },
    { id: 'action-1', data: { type: 'action', properties: { label: 'Send email', message: 'Hi' } } },
  ],
  edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1', sourceHandle: 'source' }],
};

test('marks the trigger as the start node when no node carries the flag', () => {
  const definition = snapshotToDefinition(snapshot, 'wf');
  assert.equal(definition.workflowId, 'wf');
  assert.equal(definition.nodes[0].role, 'start');
  assert.equal(definition.nodes[1].role, undefined);
});

test('prefers the isStartNode flag over the trigger type when any node carries it', () => {
  const flagged: DiagramSnapshot = {
    nodes: [
      { id: 'trigger-1', data: { type: 'trigger', properties: {} } },
      { id: 'action-1', data: { type: 'action', isStartNode: true, properties: {} } },
    ],
    edges: [],
  };
  const definition = snapshotToDefinition(flagged, 'wf');
  assert.equal(definition.nodes[0].role, undefined);
  assert.equal(definition.nodes[1].role, 'start');
});

test('lifts a trimmed label out of the properties and keeps the rest as config', () => {
  const [trigger, action] = snapshotToDefinition(snapshot, 'wf').nodes;
  assert.equal(trigger.label, 'New request');
  assert.deepEqual(trigger.config, { description: 'Entry point' });
  assert.equal(action.label, 'Send email');
  assert.deepEqual(action.config, { message: 'Hi' });
});

test('maps edges to sourceNodeId and targetNodeId and keeps the handle', () => {
  const [edge] = snapshotToDefinition(snapshot, 'wf').edges;
  assert.deepEqual(edge, { id: 'e1', sourceNodeId: 'trigger-1', targetNodeId: 'action-1', sourceHandle: 'source' });
});

test('drops a null handle instead of carrying it', () => {
  const [edge] = snapshotToDefinition(
    { nodes: snapshot.nodes, edges: [{ id: 'e1', source: 'trigger-1', target: 'action-1', sourceHandle: null }] },
    'wf',
  ).edges;
  assert.equal('sourceHandle' in edge, false);
});

test('rejects a node type the worker has no executor for', () => {
  const unknown: DiagramSnapshot = { nodes: [{ id: 'x', data: { type: 'mystery' } }], edges: [] };
  assert.throws(() => snapshotToDefinition(unknown, 'wf'), /Unknown node type "mystery"/);
});

test('rejects a diagram with no start node', () => {
  const noStart: DiagramSnapshot = { nodes: [{ id: 'a', data: { type: 'action' } }], edges: [] };
  assert.throws(() => snapshotToDefinition(noStart, 'wf'), /no start node/);
});

test("keeps a decision node's branches in config so the executor can read them", () => {
  const decisionBranches = [
    {
      id: 'branch-review',
      sourceHandle: 'source:inner:review',
      label: 'Needs review',
      conditions: [
        { x: '{{nodes.trigger-1.amount}}', comparisonOperator: 'isGreaterThan', y: '100', logicalOperator: 'AND' },
      ],
    },
    { id: 'branch-otherwise', sourceHandle: 'source:inner:otherwise', label: 'Otherwise', conditions: [] },
  ];

  const definition = snapshotToDefinition(
    {
      nodes: [
        ...snapshot.nodes,
        { id: 'decision-1', data: { type: 'decision', properties: { label: 'Needs review?', decisionBranches } } },
      ],
      edges: [],
    },
    'wf',
  );

  assert.deepEqual(definition.nodes[2], {
    id: 'decision-1',
    type: 'decision',
    label: 'Needs review?',
    config: { decisionBranches },
  });
});

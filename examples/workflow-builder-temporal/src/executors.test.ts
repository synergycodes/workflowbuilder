import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executors } from './executors';
import type { SampleDecisionBranch } from './nodes';

const decisionBranches: SampleDecisionBranch[] = [
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

// The action executor is covered by the end-to-end run instead: it reads Temporal's activity
// context, which throws outside an Activity.
test('decision names the winning branch and its handle as the next port', async () => {
  const result = await executors.decision(
    { id: 'decision-1', type: 'decision', config: { decisionBranches } },
    {
      workflowId: 'wf',
      executionId: 'run',
      triggerPayload: { amount: 50 },
      nodeOutputs: { 'trigger-1': { amount: 50 } },
      variables: {},
      global: {},
    },
  );

  assert.deepEqual(result, {
    output: { branch: 'Otherwise', sourceHandle: 'source:inner:otherwise' },
    nextPort: 'source:inner:otherwise',
  });
});

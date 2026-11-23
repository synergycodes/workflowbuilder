import { beforeEach, describe, expect, it } from 'vitest';

import '../../../../bootstrap';
import type { WorkflowBuilderNode } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import { addBranchToNode } from './add-branch-action';

const decision: WorkflowBuilderNode = {
  id: 'd1',
  position: { x: 0, y: 0 },
  type: 'decision',
  data: { type: 'decision', icon: 'Plus', properties: { decisionBranches: [] } },
};

const branchCount = () => (useStore.getState().nodes[0]?.data.properties.decisionBranches as unknown[]).length;

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({ nodes: [decision] });
});

describe('addBranchToNode', () => {
  it('appends a branch while the editor is editable', () => {
    addBranchToNode('d1');

    expect(branchCount()).toBe(1);
  });

  it('changes nothing in read-only mode', () => {
    useStore.setState({ isReadOnly: true });

    addBranchToNode('d1');

    expect(branchCount()).toBe(0);
  });
});

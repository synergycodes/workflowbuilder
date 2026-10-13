import { describe, expect, it } from 'vitest';

import { refundReviewFlow } from '../data/refund-review-flow';
import { supportTriageFlow } from '../data/support-triage-flow';
import { plugin as runViewPlugin } from '../plugins/run-view/plugin';
import type { OpenedSource } from './open-from-url';
import { neverSaves, rootPropsFor } from './root-props';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const diagram = { nodes: refundReviewFlow.value.diagram.nodes, edges: refundReviewFlow.value.diagram.edges };

const workflowSource: OpenedSource = { kind: 'workflow', workflowId: WORKFLOW, name: 'Refund desk', diagram };
const executionSource: OpenedSource = { kind: 'execution', executionId: RUN, diagram };

describe('rootPropsFor', () => {
  it('keeps the local draft on the default localStorage strategy and the flagship seed', () => {
    const props = rootPropsFor({ kind: 'local' });

    expect(props.integration).toBeUndefined();
    expect(props.initialNodes).toBe(supportTriageFlow.value.diagram.nodes);
    expect(props.plugins).not.toContain(runViewPlugin);
  });

  it("opens a workflow under its name, off localStorage, with the editor's own Save button", () => {
    const props = rootPropsFor(workflowSource);

    expect(props.integration).toMatchObject({ strategy: 'props' });
    expect(props.name).toBe('Refund desk');
    expect(props.initialNodes).toBe(diagram.nodes);
    expect(props.initialEdges).toBe(diagram.edges);
    expect(props.plugins).not.toContain(runViewPlugin);
  });

  it('opens a run under a short run name, off localStorage, with Save hidden', () => {
    const props = rootPropsFor(executionSource);

    expect(props.integration).toMatchObject({ strategy: 'props' });
    expect(props.name).toBe('Run 7c9e6679');
    expect(props.plugins).toContain(runViewPlugin);
  });

  it('hands every render the same props for one opened source', () => {
    expect(rootPropsFor(workflowSource)).toBe(rootPropsFor(workflowSource));
    expect(rootPropsFor(workflowSource).integration).not.toBe(rootPropsFor(executionSource).integration);
  });

  it('refuses the editor save a run view never triggers', async () => {
    await expect(neverSaves(rootPropsFor(executionSource) as never)).rejects.toThrow();
  });
});

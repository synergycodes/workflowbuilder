import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setReactFlowProps } from '../data/react-flow-config';
import { trackFutureChange } from '../features/changes-tracker/stores/use-changes-tracker-store';
import type { DiagramModel } from '../node/common';
import type { WorkflowBuilderEdge, WorkflowBuilderNode } from '../node/node-data';
import { resetWorkflowStore, useStore } from '../store/store';
import { loadDiagramModel } from './load-diagram-model';

vi.mock('../features/changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

function makeNode(id: string, x = 0, y = 0): WorkflowBuilderNode {
  return { id, position: { x, y }, type: 'action', data: { type: 'action', icon: 'Plus', properties: {} } };
}

function makeModel(nodes: WorkflowBuilderNode[], edges: WorkflowBuilderEdge[] = []): DiagramModel {
  return {
    name: 'Onboarding',
    layoutDirection: 'DOWN',
    diagram: { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } },
  };
}

beforeEach(() => {
  resetWorkflowStore();
  useStore.setState({
    workflowName: 'Invoice approval',
    layoutDirection: 'RIGHT',
    nodes: [makeNode('start'), makeNode('approve')],
    edges: [{ id: 'start-approve', source: 'start', target: 'approve' }],
    globalVariables: {
      apiUrl: { id: 'apiUrl', name: 'apiUrl', type: 'string', defaultValue: 'https://example.com', description: '' },
    },
  });
});

afterEach(() => {
  vi.mocked(trackFutureChange).mockReset();
  setReactFlowProps(null);
});

describe('loadDiagramModel', () => {
  it("writes the model's nodes, edges, name and layout direction", () => {
    const edge = { id: 'n1-n2', source: 'n1', target: 'n2' };

    loadDiagramModel(makeModel([makeNode('n1'), makeNode('n2', 180, 0)], [edge]));

    const { nodes, edges, workflowName, layoutDirection } = useStore.getState();
    expect(nodes.map(({ id }) => id)).toEqual(['n1', 'n2']);
    expect(edges.map(({ id }) => id)).toEqual(['n1-n2']);
    expect(workflowName).toBe('Onboarding');
    expect(layoutDirection).toBe('DOWN');
  });

  it("without a model writes an empty diagram named 'Untitled' in 'RIGHT'", () => {
    useStore.setState({ layoutDirection: 'DOWN' });

    loadDiagramModel();

    const { nodes, edges, workflowName, layoutDirection } = useStore.getState();
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
    expect(workflowName).toBe('Untitled');
    expect(layoutDirection).toBe('RIGHT');
  });

  it('snaps an off-grid node to the 18 px grid and leaves an on-grid one in place', () => {
    loadDiagramModel(makeModel([makeNode('off', 103, 47), makeNode('on', 108, 54)]));

    expect(useStore.getState().nodes.map(({ position }) => position)).toEqual([
      { x: 108, y: 54 },
      { x: 108, y: 54 },
    ]);
  });

  it("snaps to the canvas grid the host set through reactFlowProps' snapGrid", () => {
    setReactFlowProps({ snapGrid: [20, 20] });

    loadDiagramModel(makeModel([makeNode('off', 103, 47)]));

    expect(useStore.getState().nodes[0].position).toEqual({ x: 100, y: 40 });
  });

  it("leaves positions alone when the host turned reactFlowProps' snapToGrid off", () => {
    setReactFlowProps({ snapToGrid: false });

    loadDiagramModel(makeModel([makeNode('off', 103, 47)]));

    expect(useStore.getState().nodes[0].position).toEqual({ x: 103, y: 47 });
  });

  it('does not change the model it was given', () => {
    const model = makeModel([makeNode('off', 103, 47)]);

    loadDiagramModel(model);

    expect(model.diagram.nodes[0].position).toEqual({ x: 103, y: 47 });
  });

  it('tracks the change once, while the store still holds the previous diagram', () => {
    const nodeIdsWhenTracked: string[][] = [];
    vi.mocked(trackFutureChange).mockImplementation(() => {
      nodeIdsWhenTracked.push(useStore.getState().nodes.map(({ id }) => id));
    });

    loadDiagramModel(makeModel([makeNode('n1')]));

    expect(trackFutureChange).toHaveBeenCalledTimes(1);
    expect(trackFutureChange).toHaveBeenCalledWith('setDiagramModel');
    expect(nodeIdsWhenTracked).toEqual([['start', 'approve']]);
  });

  it('keeps the global variables', () => {
    const before = useStore.getState().globalVariables;

    loadDiagramModel(makeModel([makeNode('n1')]));

    expect(useStore.getState().globalVariables).toBe(before);
  });

  describe('fitting the view', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
        callback(0);
        return 0;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('fits the view once the canvas has mounted', () => {
      const fitView = vi.fn();
      useStore.setState({ reactFlowInstance: { getZoom: () => 1, fitView } as never });

      loadDiagramModel(makeModel([makeNode('n1')]));

      expect(fitView).toHaveBeenCalledTimes(1);
    });

    it('writes the store before the canvas has mounted', () => {
      expect(() => loadDiagramModel(makeModel([makeNode('n1')]))).not.toThrow();
      expect(useStore.getState().nodes.map(({ id }) => id)).toEqual(['n1']);
    });
  });
});

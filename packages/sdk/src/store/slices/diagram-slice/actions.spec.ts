// Pins the WB-340 fix: when nodes load before the palette, they are validated
// against an empty definition set and their errors are dropped. Once the palette
// arrives, `refreshNodesErrorsIfNeeded` must re-run validation and repair the
// stored nodes, while staying a no-op when nothing actually changed.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCustomPaletteNodes } from '../../../data/palette';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { mockNodeDelay } from '../../../utils/validation/get-node-errors.mock';
import { resetWorkflowStore, useStore } from '../../store';
import { getStoreDataForIntegration, refreshNodesErrorsIfNeeded, setStoreDataFromIntegration } from './actions';

// Mirrors the definition the consumer's palette would supply for `delay` nodes;
// `description` is required, so a node missing it must surface a validation error.
const delayDefinition = {
  type: 'delay',
  label: 'Delay',
  description: 'Pause the workflow',
  icon: 'Timer',
  defaultPropertiesData: mockNodeDelay.data.properties,
  schema: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string' },
      duration: { type: 'object' },
      errors: { type: 'array' },
      type: { type: 'string' },
    },
    required: ['label', 'description'],
  },
  uischema: { type: 'VerticalLayout', elements: [] },
};

/** `mockNodeDelay` stripped of its required `description`, with stale (empty) errors. */
function invalidNode(): WorkflowBuilderNode {
  const { description: _description, ...properties } = mockNodeDelay.data.properties;
  return {
    ...mockNodeDelay,
    data: { ...mockNodeDelay.data, properties: { ...properties, errors: [] } },
  };
}

describe('refreshNodesErrorsIfNeeded', () => {
  beforeAll(() => {
    setCustomPaletteNodes([delayDefinition as never]);
  });

  afterAll(() => {
    setCustomPaletteNodes(null);
  });

  beforeEach(() => {
    resetWorkflowStore();
  });

  it('repairs errors that were skipped while the palette was unavailable', () => {
    // Simulates the race: the node was validated before the palette existed, so
    // its `errors` are empty despite being invalid.
    useStore.setState({ nodes: [invalidNode()] });

    refreshNodesErrorsIfNeeded();

    const errors = useStore.getState().nodes[0].data.properties.errors;
    expect(errors).toHaveLength(1);
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ keyword: 'required' })]));
  });

  it('leaves the nodes array untouched when no errors change', () => {
    // `mockNodeDelay` is valid against the definition, so re-validation is a no-op.
    useStore.setState({ nodes: [mockNodeDelay] });
    const before = useStore.getState().nodes;

    refreshNodesErrorsIfNeeded();

    // Same reference: the deep-equal guard must skip the `setState` entirely.
    expect(useStore.getState().nodes).toBe(before);
  });

  it('does nothing when the store has no nodes', () => {
    const before = useStore.getState().nodes;

    refreshNodesErrorsIfNeeded();

    expect(useStore.getState().nodes).toBe(before);
  });
});

describe('getStoreDataForIntegration', () => {
  beforeEach(() => {
    resetWorkflowStore();
    useStore.setState({
      nodes: [
        {
          ...mockNodeDelay,
          selected: true,
          dragging: true,
          measured: { width: 241, height: 64 },
        } as WorkflowBuilderNode,
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'a',
          target: 'b',
          selected: true,
          data: { routerPointsFromAvoidNodes: [{ x: 1, y: 2 }], layoutPoints: [{ x: 3, y: 4 }] },
        } as never,
      ],
    });
  });

  it('strips runtime-only values by default', () => {
    const { nodes, edges } = getStoreDataForIntegration();

    expect(nodes[0]).not.toHaveProperty('measured');
    expect(nodes[0]).not.toHaveProperty('dragging');
    expect(nodes[0].selected).toBe(false);
    expect(edges[0].selected).toBe(false);
    expect(edges[0].data).toMatchObject({ routerPointsFromAvoidNodes: [], layoutPoints: [] });
  });

  it('returns the live store objects when asked to keep dynamic values', () => {
    const state = useStore.getState();
    const { nodes, edges } = getStoreDataForIntegration({ shouldSkipDynamicValues: false });

    expect(nodes).toBe(state.nodes);
    expect(edges).toBe(state.edges);
    expect(nodes[0]).toHaveProperty('measured');
  });
});

describe('setStoreDataFromIntegration', () => {
  const LEGACY_INSTANT = '2024-01-14T23:00:00.000Z';
  const legacyNode: WorkflowBuilderNode = {
    id: 'decision-1',
    position: { x: 0, y: 0 },
    type: 'decision',
    data: {
      type: 'decision',
      icon: 'Plus',
      properties: {
        conditions: [{ x: '{{nodes.a.when}}', comparisonOperator: '==', y: LEGACY_INSTANT, logicalOperator: 'and' }],
      },
    },
  };
  const legacyVariables = {
    deadline: {
      id: 'deadline',
      name: 'deadline',
      type: 'date' as const,
      defaultValue: LEGACY_INSTANT,
      description: '',
    },
  };

  beforeEach(() => {
    resetWorkflowStore();
  });

  it('warns once about SDK 3.0 instants in node conditions and still loads them', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    setStoreDataFromIntegration({ nodes: [legacyNode], edges: [] });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(
      /node decision-1 · conditions\[0\]\.y.*\(migration: zone-less-date-time\)$/,
    );
    expect(useStore.getState().nodes.map((node) => node.id)).toEqual(['decision-1']);
    warnSpy.mockRestore();
  });

  it('warns once about an SDK 3.0 instant in a global variable default', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    setStoreDataFromIntegration({ globalVariables: legacyVariables });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("global variable 'deadline'");
    expect(useStore.getState().globalVariables).toEqual(legacyVariables);
    warnSpy.mockRestore();
  });

  it('stays silent for 4.0 shapes and for a load without nodes or variables', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cleanNode: WorkflowBuilderNode = {
      ...legacyNode,
      data: {
        ...legacyNode.data,
        properties: { conditions: [{ x: '', comparisonOperator: '==', y: '2024-01-15', logicalOperator: 'and' }] },
      },
    };

    setStoreDataFromIntegration({
      nodes: [cleanNode],
      globalVariables: { deadline: { ...legacyVariables.deadline, defaultValue: '2024-01-15' } },
    });
    setStoreDataFromIntegration({ name: 'Only a name' });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

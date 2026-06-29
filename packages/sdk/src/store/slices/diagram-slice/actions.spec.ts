// Pins the WB-340 fix: when nodes load before the palette, they are validated
// against an empty definition set and their errors are dropped. Once the palette
// arrives, `refreshNodesErrorsIfNeeded` must re-run validation and repair the
// stored nodes, while staying a no-op when nothing actually changed.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { setCustomPaletteNodes } from '../../../data/palette';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { mockNodeDelay } from '../../../utils/validation/get-node-errors.mock';
import { resetWorkflowStore, useStore } from '../../store';
import { refreshNodesErrorsIfNeeded } from './actions';

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

// Pins what a palette drop does with the item the user is dragging. The drop
// no longer reads `dataTransfer` (which never fires on touch devices): the
// palette item is parked in the palette store on pointer-down and picked up
// here on drop. The `isStartNode` flag is what execution integrations read to
// find a workflow's entry point, so it has to survive the palette-item ->
// node-data copy — and stay absent on every node that did not declare it.
//
// `@xyflow/react` is mocked for `useStoreApi`: the hook reads
// `resetSelectedElements` off the ReactFlow store, which only exists inside a
// `<ReactFlowProvider>`. `use-translate-if-possible` is mocked to keep the
// i18next singleton out of the test.
import { renderHook } from '@testing-library/react';
import type { NodeAddChange, XYPosition } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaletteItem } from '../../../node/common';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { NodeType } from '../../../node/node-types';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { setDraggedItem, usePaletteStore } from '../stores/use-palette-store';
import { usePaletteDrop } from './use-palette-drop';

vi.mock('@xyflow/react', () => ({
  useStoreApi: () => ({ getState: () => ({ resetSelectedElements: vi.fn() }) }),
}));

const { noTranslation } = vi.hoisted(() => ({ noTranslation: () => '' }));
vi.mock('../../../hooks/use-translate-if-possible', () => ({
  useTranslateIfPossible: () => noTranslation,
}));

vi.mock('../../changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const TRIGGER_TYPE = 'my-product/trigger';

function paletteItem(overrides: Partial<PaletteItem> = {}): PaletteItem {
  return {
    label: 'Trigger',
    description: 'Start the workflow',
    type: TRIGGER_TYPE,
    icon: 'Lightning',
    defaultPropertiesData: {},
    schema: { type: 'object', properties: {} },
    ...overrides,
  } as PaletteItem;
}

type DropOptions = {
  draggedItem?: PaletteItem | null;
  clientPosition?: XYPosition;
  screenToFlowPosition?: (position: XYPosition) => XYPosition;
};

function drop(definition: PaletteItem, options: DropOptions = {}) {
  const {
    draggedItem = definition,
    clientPosition = { x: 0, y: 0 },
    screenToFlowPosition = () => ({ x: 0, y: 0 }),
  } = options;

  const onNodesChange = vi.fn();
  useStore.setState({
    getNodeDefinition: () => definition,
    onNodesChange,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactFlowInstance: { screenToFlowPosition } as any,
  });
  setDraggedItem(draggedItem);

  const { result } = renderHook(() => usePaletteDrop());
  result.current.onDropFromPalette({
    preventDefault: vi.fn(),
    clientX: clientPosition.x,
    clientY: clientPosition.y,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return onNodesChange;
}

function dropFromPalette(definition: PaletteItem, options: DropOptions = {}) {
  const onNodesChange = drop(definition, options);
  const [changes] = onNodesChange.mock.calls[0] as [NodeAddChange<WorkflowBuilderNode>[]];
  return changes[0]!.item;
}

beforeEach(() => {
  resetWorkflowStore();
  setDraggedItem(null);
});

describe('usePaletteDrop — dragged item handoff', () => {
  it('adds the node the palette store says is being dragged', () => {
    const node = dropFromPalette(paletteItem());

    expect(node.data.type).toBe(TRIGGER_TYPE);
  });

  it('does nothing when no palette item is being dragged', () => {
    const onNodesChange = drop(paletteItem(), { draggedItem: null });

    expect(onNodesChange).not.toHaveBeenCalled();
  });

  it('clears the dragged item once the drop is handled', () => {
    dropFromPalette(paletteItem());

    expect(usePaletteStore.getState().draggedItem).toBeNull();
  });

  it('places the node at the flow position of the pointer', () => {
    const node = dropFromPalette(paletteItem(), {
      clientPosition: { x: 10, y: 20 },
      screenToFlowPosition: ({ x, y }) => ({ x: x + 100, y: y + 200 }),
    });

    expect(node.position).toEqual({ x: 110, y: 220 });
  });
});

describe('usePaletteDrop — start-node flag', () => {
  it('copies isStartNode onto the dropped node', () => {
    const node = dropFromPalette(paletteItem({ isStartNode: true, templateType: NodeType.StartNode }));

    expect(node.data.isStartNode).toBe(true);
  });

  it('leaves the flag off a node whose palette item does not declare it', () => {
    const node = dropFromPalette(paletteItem());

    expect(node.data).not.toHaveProperty('isStartNode');
  });

  it('keeps the flag independent of the visual template', () => {
    const node = dropFromPalette(paletteItem({ isStartNode: true, templateType: NodeType.AiNode }));

    expect(node.type).toBe(NodeType.AiNode);
    expect(node.data.isStartNode).toBe(true);
  });
});

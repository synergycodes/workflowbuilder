// Pins what a palette drop writes into the new node's `data` (WB-430). The
// `isStartNode` flag is what execution integrations read to find a workflow's
// entry point, so it has to survive the palette-item -> node-data copy — and
// stay absent on every node that did not declare it.
//
// `@xyflow/react` is mocked for `useStoreApi`: the hook reads
// `resetSelectedElements` off the ReactFlow store, which only exists inside a
// `<ReactFlowProvider>`. `use-translate-if-possible` is mocked to keep the
// i18next singleton out of the test.
import { renderHook } from '@testing-library/react';
import type { NodeAddChange } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaletteItem } from '../node/common';
import type { WorkflowBuilderNode } from '../node/node-data';
import { NodeType } from '../node/node-types';
import { resetWorkflowStore, useStore } from '../store/store';
import { dataFormat } from '../utils/consts';
import { usePaletteDrop } from './use-palette-drop';

vi.mock('@xyflow/react', () => ({
  useStoreApi: () => ({ getState: () => ({ resetSelectedElements: vi.fn() }) }),
}));

const { noTranslation } = vi.hoisted(() => ({ noTranslation: () => '' }));
vi.mock('./use-translate-if-possible', () => ({
  useTranslateIfPossible: () => noTranslation,
}));

vi.mock('../features/changes-tracker/stores/use-changes-tracker-store', () => ({
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

function dropFromPalette(definition: PaletteItem) {
  const onNodesChange = vi.fn();
  useStore.setState({
    getNodeDefinition: () => definition,
    onNodesChange,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactFlowInstance: { screenToFlowPosition: () => ({ x: 0, y: 0 }) } as any,
  });

  const { result } = renderHook(() => usePaletteDrop());
  result.current.onDropFromPalette({
    preventDefault: vi.fn(),
    clientX: 0,
    clientY: 0,
    dataTransfer: {
      getData: (format: string) => (format === dataFormat ? JSON.stringify({ type: definition.type }) : ''),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const [changes] = onNodesChange.mock.calls[0] as [NodeAddChange<WorkflowBuilderNode>[]];
  return changes[0]!.item;
}

beforeEach(() => {
  resetWorkflowStore();
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

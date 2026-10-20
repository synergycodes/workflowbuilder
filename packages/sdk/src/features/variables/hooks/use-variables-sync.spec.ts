import { renderHook } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCustomPaletteNodes } from '../../../data/palette';
import type { PaletteItem } from '../../../node/common';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { setStoreNodes } from '../../../store/slices/diagram-slice/actions';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { getNodeVariablesSuggestions } from '../stores/core/get-node-variables-suggestions';
import { emptyVariablesSuggestionsStore, useVariablesSuggestionsStore } from '../stores/use-variable-suggestions-store';
import { useVariablesSync } from './use-variables-sync';

const SYNC_DELAY_MS = 500;

const fetchNode = {
  type: 'fetch',
  label: 'Fetch',
  description: '',
  icon: 'PlayCircle',
  defaultPropertiesData: {},
  schema: { type: 'object', properties: {} },
  schemaOutput: {
    type: 'default',
    bySourceHandle: { every: { type: 'object', properties: { result: { type: 'string', title: 'Result' } } } },
  },
} as unknown as PaletteItem;

const triggerNode = {
  type: 'trigger',
  label: 'Trigger',
  description: '',
  icon: 'PlayCircle',
  defaultPropertiesData: {},
  schema: { type: 'object', properties: {} },
  schemaOutput: {
    type: 'variant',
    variants: [
      {
        variantRule: { onlyIfPropertyNameEquals: { path: 'mode', value: 'timed' } },
        bySourceHandle: { every: { type: 'object', properties: { startDate: { type: 'string', title: 'Start' } } } },
      },
    ],
  },
} as unknown as PaletteItem;

function node(id: string, type: string, properties: Record<string, unknown> = {}): WorkflowBuilderNode {
  return {
    id,
    type: 'node',
    position: { x: 0, y: 0 },
    data: { type, icon: 'PlayCircle', properties: { label: id, ...properties } },
  } as unknown as WorkflowBuilderNode;
}

const idsOf = (nodeId: string) =>
  getNodeVariablesSuggestions({ nodeId, sourceHandle: 'source' })?.map((suggestion) => suggestion.id);

const lastUpdateIndex = () => useVariablesSuggestionsStore.getState().lastUpdateIndex;

const settle = () => vi.advanceTimersByTime(SYNC_DELAY_MS);

const setMode = (nodeId: string, mode: string) =>
  useStore.getState().setNodeProperties(nodeId, { label: nodeId, mode });

beforeAll(() => {
  setCustomPaletteNodes([fetchNode, triggerNode]);
});

afterAll(() => {
  setCustomPaletteNodes(null);
});

beforeEach(() => {
  vi.useFakeTimers();
  resetWorkflowStore();
  useVariablesSuggestionsStore.setState(emptyVariablesSuggestionsStore, true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useVariablesSync lifecycle', () => {
  it('indexes the nodes already in the store on mount, without waiting', () => {
    setStoreNodes([node('f0', 'fetch')]);

    renderHook(() => useVariablesSync());

    expect(idsOf('f0')).toEqual(['nodes.f0.result']);
  });

  it('drops a pending rebuild on unmount', () => {
    const { unmount } = renderHook(() => useVariablesSync());
    setStoreNodes([node('f1', 'fetch')]);

    unmount();
    settle();

    expect(idsOf('f1')).toBeUndefined();
  });
});

describe('useVariablesSync', () => {
  beforeEach(() => {
    renderHook(() => useVariablesSync());
  });

  it('indexes a node added through setStoreNodes once the burst window passes', () => {
    setStoreNodes([node('f1', 'fetch')]);
    expect(idsOf('f1')).toBeUndefined();

    settle();

    expect(idsOf('f1')).toEqual(['nodes.f1.result']);
  });

  it('applies a variant switch made through setNodeProperties', () => {
    setStoreNodes([node('t1', 'trigger')]);
    settle();
    expect(idsOf('t1')).toEqual([]);

    setMode('t1', 'timed');
    settle();

    expect(idsOf('t1')).toEqual(['nodes.t1.startDate']);
  });

  it('picks up a raw useStore.setState from a plugin', () => {
    useStore.setState({ nodes: [node('t2', 'trigger', { mode: 'timed' })] });

    settle();

    expect(idsOf('t2')).toEqual(['nodes.t2.startDate']);
  });

  it('pushes the window back on every change, then applies all of them since the burst began', () => {
    setStoreNodes([node('t1', 'trigger'), node('t2', 'trigger')]);
    settle();

    setMode('t1', 'timed');
    vi.advanceTimersByTime(SYNC_DELAY_MS - 100);
    setMode('t2', 'timed');
    vi.advanceTimersByTime(SYNC_DELAY_MS - 100);

    expect(idsOf('t1')).toEqual([]);
    expect(idsOf('t2')).toEqual([]);

    vi.advanceTimersByTime(100);

    expect(idsOf('t1')).toEqual(['nodes.t1.startDate']);
    expect(idsOf('t2')).toEqual(['nodes.t2.startDate']);
  });

  it('re-indexes only the nodes whose data changed', () => {
    setStoreNodes([node('f1', 'fetch'), node('t1', 'trigger')]);
    settle();
    const fetchEntry = useVariablesSuggestionsStore.getState().byNodeId.f1;

    setMode('t1', 'timed');
    settle();

    expect(useVariablesSuggestionsStore.getState().byNodeId.f1).toBe(fetchEntry);
    expect(idsOf('t1')).toEqual(['nodes.t1.startDate']);
  });

  it('does not rebuild the index for a drag or a selection', () => {
    setStoreNodes([node('f2', 'fetch')]);
    settle();
    const before = lastUpdateIndex();

    useStore.getState().onNodesChange([{ type: 'position', id: 'f2', position: { x: 10, y: 20 }, dragging: true }]);
    useStore.getState().onNodesChange([{ type: 'select', id: 'f2', selected: true }]);
    settle();

    expect(useStore.getState().nodes[0].position).toEqual({ x: 10, y: 20 });
    expect(lastUpdateIndex()).toBe(before);
  });
});

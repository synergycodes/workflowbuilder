import { renderHook } from '@testing-library/react';
import i18n from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import '../features/i18n/index';
import type { WorkflowBuilderNode } from '../node/node-data';
import { resetWorkflowStore, useStore } from './store';

function makeNode(id: string): WorkflowBuilderNode {
  return {
    id,
    position: { x: 0, y: 0 },
    type: 'action',
    data: { type: 'action', icon: 'Plus', properties: {} },
  };
}

// The store is a global singleton; reset before each test so state written by
// one test never leaks into the next. `beforeEach` (not `afterEach`) avoids
// resetting while a just-rendered hook component is still mounted — that would
// fire a store update outside `act(...)`.
beforeEach(() => {
  resetWorkflowStore();
});

describe('useStore (global singleton)', () => {
  it('exposes the full editor state with empty initial nodes/edges', () => {
    const state = useStore.getState();

    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(typeof state.onNodesChange).toBe('function');
  });

  it('getState() works with no Root mounted — never throws "before mount"', () => {
    // The whole point of the global store: imperative reads resolve from
    // module load. Previously this path crashed when a descendant read the
    // store during render before the Root had registered a per-Root store.
    expect(() => useStore.getState()).not.toThrow();
    expect(useStore.getState().nodes).toEqual([]);
  });

  it('setState writes and getState reflects it', () => {
    useStore.setState({ nodes: [makeNode('n1')] });

    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().nodes[0].id).toBe('n1');
  });

  it('selector hook reads live state', () => {
    useStore.setState({ nodes: [makeNode('hooked')] });

    const { result } = renderHook(() => useStore((s) => s.nodes));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('hooked');
  });
});

describe('resetWorkflowStore', () => {
  it('restores initial nodes/edges while keeping the action functions', () => {
    useStore.setState({ nodes: [makeNode('dirty')] });
    expect(useStore.getState().nodes).toHaveLength(1);

    resetWorkflowStore();

    expect(useStore.getState().nodes).toEqual([]);
    expect(useStore.getState().edges).toEqual([]);
    // `replace: true` swapped the whole state object — actions must survive
    // because `getInitialState()` carries them.
    expect(typeof useStore.getState().onNodesChange).toBe('function');
  });
});

// Regression pin for c1e0dba8: the SDK i18n instance must be initialized
// (i18n.on a function) before any consumer calls useDetectLanguageChange.
describe('regression: c1e0dba8 i18n init', () => {
  it('i18n.on is a function after the SDK i18n module loads', () => {
    expect(typeof i18n.on).toBe('function');
  });
});

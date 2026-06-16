import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setIsValidConnection, setReactFlowProps } from '../../../data/react-flow-config';
import type { WorkflowBuilderNode } from '../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../store/store';
import { useIsValidConnection } from './use-react-flow-config';

function makeNode(id: string, dataType: string): WorkflowBuilderNode {
  return {
    id,
    position: { x: 0, y: 0 },
    type: dataType,
    data: { type: dataType, icon: 'Plus', properties: {} },
  };
}

beforeEach(() => {
  resetWorkflowStore();
  setIsValidConnection(null);
  setReactFlowProps(null);
});

describe('useIsValidConnection', () => {
  it('returns undefined when no consumer callback is set', () => {
    const { result } = renderHook(() => useIsValidConnection());

    expect(result.current).toBeUndefined();
  });

  it('forwards the resolved nodes and connection, returning the consumer result', () => {
    useStore.setState({ nodes: [makeNode('a', 'start'), makeNode('b', 'action')] });
    const spy = vi.fn().mockReturnValue(false);
    setIsValidConnection(spy);

    const { result } = renderHook(() => useIsValidConnection());
    const connection = { source: 'a', target: 'b', sourceHandle: 'source', targetHandle: 'target' };
    const valid = result.current?.(connection);

    expect(valid).toBe(false);
    expect(spy).toHaveBeenCalledTimes(1);
    const params = spy.mock.calls[0][0];
    expect(params.sourceNode.id).toBe('a');
    expect(params.targetNode.id).toBe('b');
    expect(params.connection).toEqual(connection);
  });

  it('allows the connection (returns true) when a node id cannot be resolved', () => {
    useStore.setState({ nodes: [makeNode('a', 'start')] });
    const spy = vi.fn().mockReturnValue(false);
    setIsValidConnection(spy);

    const { result } = renderHook(() => useIsValidConnection());
    const valid = result.current?.({ source: 'a', target: 'missing', sourceHandle: null, targetHandle: null });

    expect(valid).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('normalizes undefined handle ids to null', () => {
    useStore.setState({ nodes: [makeNode('a', 'start'), makeNode('b', 'action')] });
    const spy = vi.fn().mockReturnValue(true);
    setIsValidConnection(spy);

    const { result } = renderHook(() => useIsValidConnection());
    // Edge-shaped candidate without handle fields.
    result.current?.({ source: 'a', target: 'b' } as never);

    const params = spy.mock.calls[0][0];
    expect(params.connection.sourceHandle).toBeNull();
    expect(params.connection.targetHandle).toBeNull();
  });
});

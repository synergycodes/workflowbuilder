import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEdgeTypes } from './use-edge-types';

vi.mock('../edges/label-edge/label-edge', () => ({ LabelEdge: () => null }));

describe('useEdgeTypes', () => {
  it('returns a referentially stable object across re-renders when no custom types are passed', () => {
    const { result, rerender } = renderHook(() => useEdgeTypes());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('exposes the built-in labelEdge renderer', () => {
    const { result } = renderHook(() => useEdgeTypes());

    expect(result.current).toHaveProperty('labelEdge');
  });

  it('merges custom edge types and stays stable while the custom object is stable', () => {
    const custom = { custom: () => null };
    const { result, rerender } = renderHook(({ types }) => useEdgeTypes(types), {
      initialProps: { types: custom },
    });
    const first = result.current;

    expect(result.current).toHaveProperty('custom');

    rerender({ types: custom });

    expect(result.current).toBe(first);
  });
});

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setCustomEdgeTemplates } from '../../../data/edge-templates';

// Mock the built-in default edge so the test doesn't pull the full edge
// rendering stack (xyflow path math, CSS side effects).
vi.mock('../edges/label-edge/label-edge', () => ({ LabelEdge: () => null }));

const { useEdgeTypes } = await import('./use-edge-types');

function Noop() {
  return null;
}

describe('useEdgeTypes', () => {
  afterEach(() => {
    setCustomEdgeTemplates(null);
    vi.restoreAllMocks();
  });

  it('registers the built-in labelEdge by default', () => {
    const { result } = renderHook(() => useEdgeTypes());

    expect(result.current['labelEdge']).toBeDefined();
  });

  it('registers a custom edge template under its own key, unwrapped', () => {
    setCustomEdgeTemplates({ animated: Noop });

    const { result } = renderHook(() => useEdgeTypes());

    // No adapter: the consumer's component is registered as-is (identity),
    // unlike node templates which are wrapped to inject computed props.
    expect(result.current['animated']).toBe(Noop);
    expect(result.current['labelEdge']).toBeDefined();
  });

  it('warns in dev when a custom key collides with the built-in labelEdge', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setCustomEdgeTemplates({ labelEdge: Noop });

    renderHook(() => useEdgeTypes());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"labelEdge"'));
  });

  it('does not warn for non-colliding custom edge keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setCustomEdgeTemplates({ animated: Noop });

    renderHook(() => useEdgeTypes());

    expect(spy).not.toHaveBeenCalled();
  });

  it('returns a stable reference across re-renders when no custom templates exist', () => {
    const { result, rerender } = renderHook(() => useEdgeTypes());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});

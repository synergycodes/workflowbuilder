import { render, renderHook } from '@testing-library/react';
import type { ComponentType } from 'react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setCustomNodeTemplates } from '../../../data/node-templates';
import type { LayoutDirection } from '../../../node/common';
import { NodeType } from '../../../node/node-types';
import type { WorkflowNodeTemplateProps } from '../nodes/workflow-node-template/workflow-node-template';

vi.mock('../nodes/node-container', () => ({ NodeContainer: () => null }));
vi.mock('../nodes/start-node-container', () => ({ StartContainer: () => null }));
vi.mock('../nodes/ai-node-container', () => ({ AiNodeContainer: () => null }));
vi.mock('../nodes/decision-node-container', () => ({ DecisionNodeContainer: () => null }));

let mockLayoutDirection: LayoutDirection = 'RIGHT';
vi.mock('../../../store/store', () => ({
  useStore: <T>(selector: (state: { layoutDirection: LayoutDirection }) => T) =>
    selector({ layoutDirection: mockLayoutDirection }),
}));

const { useNodeTypes } = await import('./use-node-types');

function Noop() {
  return null;
}

// Render the adapter ReactFlow would mount on the canvas with a minimal
// NodeProps-shaped payload, so we can assert what the adapter forwards.
function renderAdapter(
  Adapter: ComponentType<unknown>,
  data: { icon: string; properties: Record<string, unknown>; type: string },
) {
  return render(
    createElement(Adapter as ComponentType<Record<string, unknown>>, {
      id: 'n1',
      data,
      selected: false,
    }),
  );
}

describe('useNodeTypes', () => {
  afterEach(() => {
    setCustomNodeTemplates(null);
    mockLayoutDirection = 'RIGHT';
    vi.restoreAllMocks();
  });

  it('warns in dev when a custom template key collides with a built-in renderer', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setCustomNodeTemplates({ [NodeType.Node]: Noop });

    renderHook(() => useNodeTypes());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining(`"${NodeType.Node}"`));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('overrides a built-in renderer'));
  });

  it('does not warn for non-colliding custom template keys', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setCustomNodeTemplates({ 'multi-port': Noop });

    renderHook(() => useNodeTypes());

    expect(spy).not.toHaveBeenCalled();
  });

  it('forwards isValid (computed from properties errors) to the custom template', () => {
    const received: { isValid?: boolean }[] = [];
    function Recorder(props: WorkflowNodeTemplateProps) {
      received.push({ isValid: props.isValid });
      return null;
    }
    setCustomNodeTemplates({ 'multi-port': Recorder });

    const { result } = renderHook(() => useNodeTypes());
    const Adapter = result.current['multi-port'] as ComponentType<unknown>;

    renderAdapter(Adapter, {
      type: 'multi-port',
      icon: 'Star',
      properties: { errors: [], customErrors: [] },
    });
    renderAdapter(Adapter, {
      type: 'multi-port',
      icon: 'Star',
      properties: { errors: [{ instancePath: '/label', message: 'required' }], customErrors: [] },
    });

    expect(received).toEqual([{ isValid: true }, { isValid: false }]);
  });

  it('forwards layoutDirection from the store to the custom template', () => {
    const received: { layoutDirection?: LayoutDirection }[] = [];
    function Recorder(props: WorkflowNodeTemplateProps) {
      received.push({ layoutDirection: props.layoutDirection });
      return null;
    }
    setCustomNodeTemplates({ 'multi-port': Recorder });

    mockLayoutDirection = 'DOWN';
    const { result } = renderHook(() => useNodeTypes());
    const Adapter = result.current['multi-port'] as ComponentType<unknown>;

    renderAdapter(Adapter, {
      type: 'multi-port',
      icon: 'Star',
      properties: { errors: [], customErrors: [] },
    });

    expect(received).toEqual([{ layoutDirection: 'DOWN' }]);
  });
});

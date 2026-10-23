import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../../store/store';
import type { WorkflowBuilderLoadContext } from '../../../../../workflow-builder-root/workflow-builder-root.types';
import { getStoreSavingStatus, resetIntegrationStore } from '../../../stores/use-integration-store';
import { IntegrationWrapper } from './integration-wrapper';

vi.mock('@/utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

const node: WorkflowBuilderNode = {
  id: 'loaded',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'action', icon: 'Plus', properties: {} },
};
const nodes = [node];

type WrapperProps = {
  isLoaded: boolean;
  loadFailed?: boolean;
  onLoad: (context: WorkflowBuilderLoadContext) => void;
};

function wrapperElement({ isLoaded, loadFailed = false, onLoad }: WrapperProps) {
  return (
    <StrictMode>
      <IntegrationWrapper isLoaded={isLoaded} loadFailed={loadFailed} onLoad={onLoad} nodes={nodes} onSave={vi.fn()} />
    </StrictMode>
  );
}

function loadedNodeIds() {
  return useStore.getState().nodes.map(({ id }) => id);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkflowStore();
  resetIntegrationStore();
});

describe('IntegrationWrapper', () => {
  it('loads nothing and does not call onLoad while isLoaded is false', () => {
    const onLoad = vi.fn();

    render(wrapperElement({ isLoaded: false, onLoad }));

    expect(loadedNodeIds()).toEqual([]);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('loads the data once isLoaded turns true, then calls onLoad with isEmpty, loadFailed and the actions', () => {
    const onLoad = vi.fn();
    const view = render(wrapperElement({ isLoaded: false, onLoad }));

    view.rerender(wrapperElement({ isLoaded: true, onLoad }));

    expect(loadedNodeIds()).toEqual(['loaded']);
    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith({
      isEmpty: false,
      loadFailed: false,
      actions: expect.objectContaining({ save: expect.any(Function), setPaletteOpen: expect.any(Function) }),
    });
    expect(getStoreSavingStatus()).toBe('waiting');
  });

  it('after a failed load passes loadFailed and leaves the saving status refusing saves', () => {
    const onLoad = vi.fn();

    render(wrapperElement({ isLoaded: true, loadFailed: true, onLoad }));

    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ loadFailed: true }));
    expect(getStoreSavingStatus()).toBe('loadFailed');
  });

  it('onLoad fires once under StrictMode', () => {
    const onLoad = vi.fn();

    render(wrapperElement({ isLoaded: true, onLoad }));

    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('a re-render with a new onLoad neither reloads the data over edits nor calls onLoad again', () => {
    const firstOnLoad = vi.fn();
    const view = render(wrapperElement({ isLoaded: true, onLoad: firstOnLoad }));
    act(() => {
      useStore.setState({ nodes: [] });
    });
    const secondOnLoad = vi.fn();

    view.rerender(wrapperElement({ isLoaded: true, onLoad: secondOnLoad }));

    expect(loadedNodeIds()).toEqual([]);
    expect(firstOnLoad).toHaveBeenCalledOnce();
    expect(secondOnLoad).not.toHaveBeenCalled();
  });
});

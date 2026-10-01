import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderNode } from '../../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../../store/store';
import type { WorkflowBuilderStartContext } from '../../../../../workflow-builder-root/workflow-builder-root.types';
import { openTemplateSelectorModal } from '../../../../modals/template-selector/open-template-selector-modal';
import { IntegrationWrapper } from './integration-wrapper';

vi.mock('@/utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

vi.mock('@/features/modals/template-selector/open-template-selector-modal', () => ({
  openTemplateSelectorModal: vi.fn(),
}));

const node: WorkflowBuilderNode = {
  id: 'loaded',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'action', icon: 'Plus', properties: {} },
};
const nodes = [node];

type WrapperProps = { isLoaded: boolean; onStart: (context: WorkflowBuilderStartContext) => void };

function wrapperElement({ isLoaded, onStart }: WrapperProps) {
  return (
    <StrictMode>
      <IntegrationWrapper isLoaded={isLoaded} onStart={onStart} nodes={nodes} onSave={vi.fn()} />
    </StrictMode>
  );
}

function loadedNodeIds() {
  return useStore.getState().nodes.map(({ id }) => id);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkflowStore();
});

describe('IntegrationWrapper', () => {
  it('loads nothing and does not start while isLoaded is false', () => {
    const onStart = vi.fn();

    render(wrapperElement({ isLoaded: false, onStart }));

    expect(loadedNodeIds()).toEqual([]);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('loads the data once isLoaded turns true, then calls onStart with isEmpty and the guarded opener', () => {
    const onStart = vi.fn();
    const view = render(wrapperElement({ isLoaded: false, onStart }));

    view.rerender(wrapperElement({ isLoaded: true, onStart }));

    expect(loadedNodeIds()).toEqual(['loaded']);
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith({ isEmpty: false, openTemplates: openTemplateSelectorModal });
  });

  it('onStart fires once under StrictMode', () => {
    const onStart = vi.fn();

    render(wrapperElement({ isLoaded: true, onStart }));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it('a re-render with a new onStart neither reloads the data over edits nor starts again', () => {
    const firstOnStart = vi.fn();
    const view = render(wrapperElement({ isLoaded: true, onStart: firstOnStart }));
    act(() => {
      useStore.setState({ nodes: [] });
    });
    const secondOnStart = vi.fn();

    view.rerender(wrapperElement({ isLoaded: true, onStart: secondOnStart }));

    expect(loadedNodeIds()).toEqual([]);
    expect(firstOnStart).toHaveBeenCalledOnce();
    expect(secondOnStart).not.toHaveBeenCalled();
  });
});

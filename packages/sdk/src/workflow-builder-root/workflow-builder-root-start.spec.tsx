import { act, render } from '@testing-library/react';
import i18n from 'i18next';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { useModalStore } from '../features/modals/stores/use-modal-store';
import { useWorkflowBuilderActions } from '../hooks/use-workflow-builder-actions';
import type { WorkflowBuilderNode } from '../node/node-data';
import { resetWorkflowStore, useStore } from '../store/store';
import { showTranslatedSnackbar } from '../utils/show-translated-snackbar';
import { WorkflowBuilderRoot } from './workflow-builder-root';
import type { WorkflowBuilderRootProps } from './workflow-builder-root.types';

vi.mock('../utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

const localStorageKey = 'workflowBuilderDiagram';
const storedNode: WorkflowBuilderNode = {
  id: 'stored',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'action', icon: 'Plus', properties: {} },
};

let templateSelectorOpenings = 0;
let unsubscribeModalStore = () => {};

beforeEach(() => {
  resetWorkflowStore();
  localStorage.clear();
  useModalStore.setState({ isOpen: false, modal: null });
  templateSelectorOpenings = 0;
  unsubscribeModalStore = useModalStore.subscribe((state, previous) => {
    if (state.modal?.title === i18n.t('templateSelector.title') && !previous.isOpen) templateSelectorOpenings += 1;
  });
});

afterEach(() => {
  unsubscribeModalStore();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

function ReadOnlyOnMount() {
  const { setReadOnly } = useWorkflowBuilderActions();
  useEffect(() => setReadOnly(true), [setReadOnly]);
  return null;
}

function storeDiagram(diagram: object) {
  localStorage.setItem(localStorageKey, JSON.stringify(diagram));
}

function rootElement(props: WorkflowBuilderRootProps) {
  return (
    <StrictMode>
      <WorkflowBuilderRoot {...props}>{props.children ?? <span />}</WorkflowBuilderRoot>
    </StrictMode>
  );
}

async function renderRoot(props: WorkflowBuilderRootProps = {}) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(rootElement(props));
  });
  return view;
}

describe('WorkflowBuilderRoot onStart', () => {
  it('onStart fires once after the localStorage load resolves, with isEmpty false when a diagram was stored', async () => {
    storeDiagram({ nodes: [storedNode], edges: [] });
    const onStart = vi.fn();

    await renderRoot({ onStart });

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: false }));
    expect(useStore.getState().nodes.map(({ id }) => id)).toEqual(['stored']);
  });

  it('onStart fires with isEmpty true when nothing was stored', async () => {
    const onStart = vi.fn();

    await renderRoot({ onStart });

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it('the default onStart opens the template selector for an empty diagram', async () => {
    await renderRoot();

    expect(templateSelectorOpenings).toBe(1);
  });

  it('a name prop alone leaves isEmpty true', async () => {
    const onStart = vi.fn();

    await renderRoot({ name: 'demo', onStart });

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it('a Root without name and with a stored diagram never opens the template selector', async () => {
    storeDiagram({ nodes: [storedNode], edges: [] });

    await renderRoot();

    expect(templateSelectorOpenings).toBe(0);
  });

  it('a custom onStart replaces the default: no template selector unless it calls openTemplates', async () => {
    const onStart = vi.fn();

    await renderRoot({ onStart });

    expect(onStart).toHaveBeenCalledOnce();
    expect(templateSelectorOpenings).toBe(0);
  });

  it('openTemplates from the start context opens the template selector', async () => {
    await renderRoot({ onStart: ({ openTemplates }) => openTemplates() });

    expect(templateSelectorOpenings).toBe(1);
  });

  it('onStart fires once under StrictMode, also when a re-render passes a new handler', async () => {
    const onStart = vi.fn();
    const view = await renderRoot({ onStart: (context) => onStart(context) });

    await act(async () => {
      view.rerender(rootElement({ onStart: (context) => onStart(context) }));
    });

    expect(onStart).toHaveBeenCalledOnce();
  });

  it('with the api strategy onStart waits for the fetch and fires on failure with isEmpty true', async () => {
    const pendingLoadFailures: ((reason: Error) => void)[] = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          pendingLoadFailures.push(reject);
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onStart = vi.fn();

    await renderRoot({ integration: { strategy: 'api', endpoints: { load: '/load', save: '/save' } }, onStart });

    expect(fetchMock).toHaveBeenCalledWith('/load');
    expect(onStart).not.toHaveBeenCalled();

    await act(async () => {
      pendingLoadFailures.at(-1)!(new Error('network'));
    });

    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it('read-only start with an empty diagram does not open the template selector', async () => {
    await renderRoot({ children: <ReadOnlyOnMount /> });

    expect(useStore.getState().isReadOnly).toBe(true);
    expect(templateSelectorOpenings).toBe(0);
  });

  it('the "restored" snackbar shows once', async () => {
    storeDiagram({ name: 'stored', nodes: [storedNode], edges: [] });

    await renderRoot({ name: 'demo' });

    const restoreToasts = vi
      .mocked(showTranslatedSnackbar)
      .mock.calls.filter(([options]) => options.title === 'restoreDiagramSuccess');
    expect(restoreToasts).toHaveLength(1);
  });
});

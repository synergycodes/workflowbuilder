import { act, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../features/i18n/index';
import { getStoreSavingStatus, loadData } from '../features/integration/stores/use-integration-store';
import type * as integrationStore from '../features/integration/stores/use-integration-store';
import { useModalStore } from '../features/modals/stores/use-modal-store';
import { useThemeStore } from '../hooks/theme';
import { type WorkflowBuilderActions, useWorkflowBuilderActions } from '../hooks/use-workflow-builder-actions';
import type { WorkflowBuilderNode } from '../node/node-data';
import { resetWorkflowStore, useStore } from '../store/store';
import { showTranslatedSnackbar } from '../utils/show-translated-snackbar';
import { WorkflowBuilderRoot } from './workflow-builder-root';
import type { WorkflowBuilderRootProps } from './workflow-builder-root.types';

vi.mock('../utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

// The real loadData, wrapped so its call count can be asserted.
vi.mock('../features/integration/stores/use-integration-store', async (importOriginal) => {
  const actual = await importOriginal<typeof integrationStore>();
  return { ...actual, loadData: vi.fn(actual.loadData) };
});

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
  useThemeStore.setState({ persisted: 'light', controlled: null, onChange: null });
});

const apiIntegration = { strategy: 'api', endpoints: { load: '/load', save: '/save' } } as const;

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

describe('WorkflowBuilderRoot onLoad', () => {
  it('onLoad fires once after the localStorage load resolves, with isEmpty false when a diagram was stored', async () => {
    storeDiagram({ nodes: [storedNode], edges: [] });
    const onLoad = vi.fn();

    await renderRoot({ onLoad });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: false }));
    expect(useStore.getState().nodes.map(({ id }) => id)).toEqual(['stored']);
  });

  it('onLoad fires with isEmpty true when nothing was stored', async () => {
    const onLoad = vi.fn();

    await renderRoot({ onLoad });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it('the default onLoad opens the template selector for an empty diagram', async () => {
    await renderRoot();

    expect(templateSelectorOpenings).toBe(1);
  });

  it('a name prop alone leaves isEmpty true', async () => {
    const onLoad = vi.fn();

    await renderRoot({ name: 'demo', onLoad });

    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true }));
  });

  it('a Root without name and with a stored diagram never opens the template selector', async () => {
    storeDiagram({ nodes: [storedNode], edges: [] });

    await renderRoot();

    expect(templateSelectorOpenings).toBe(0);
  });

  it('a custom onLoad replaces the default: no template selector unless it calls actions.openTemplates', async () => {
    const onLoad = vi.fn();

    await renderRoot({ onLoad });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(templateSelectorOpenings).toBe(0);
  });

  it('actions.openTemplates from the load context opens the template selector', async () => {
    await renderRoot({ onLoad: ({ actions }) => actions.openTemplates() });

    expect(templateSelectorOpenings).toBe(1);
  });

  it('onLoad fires once under StrictMode, also when a re-render passes a new handler', async () => {
    const onLoad = vi.fn();
    const view = await renderRoot({ onLoad: (context) => onLoad(context) });

    await act(async () => {
      view.rerender(rootElement({ onLoad: (context) => onLoad(context) }));
    });

    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('with the api strategy onLoad waits for the fetch and fires on failure with loadFailed true', async () => {
    const pendingLoadFailures: ((reason: Error) => void)[] = [];
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((_resolve, reject) => {
          pendingLoadFailures.push(reject);
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onLoad = vi.fn();

    await renderRoot({ integration: apiIntegration, onLoad });

    expect(fetchMock).toHaveBeenCalledWith('/load');
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.queryByText(i18n.t('loader.text'))).not.toBeNull();

    await act(async () => {
      pendingLoadFailures.at(-1)!(new Error('network'));
    });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: true, loadFailed: true }));
  });

  it('after a failed api load the editor is usable without a loader or template selector, and refuses every save', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    let actions!: WorkflowBuilderActions;

    await renderRoot({
      integration: apiIntegration,
      initialNodes: [storedNode],
      onLoad: (context) => ({ actions } = context),
    });
    act(() => actions.setWorkflowName('edited'));

    expect(screen.queryByText(i18n.t('loader.text'))).toBeNull();
    expect(templateSelectorOpenings).toBe(0);
    expect(useStore.getState().workflowName).toBe('edited');
    expect(useStore.getState().nodes.map(({ id }) => id)).toEqual(['stored']);
    expect(getStoreSavingStatus()).toBe('loadFailed');
    expect(vi.mocked(showTranslatedSnackbar)).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'restoreDiagramSuccess' }),
    );
    expect(await actions.save()).toBe('error');
    expect(fetchMock).not.toHaveBeenCalledWith('/save', expect.anything());
  });

  it('the default onLoad does not open the template selector after a failed api load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    await renderRoot({ integration: apiIntegration });

    expect(templateSelectorOpenings).toBe(0);
  });

  it('with the api strategy onLoad fires once with loadFailed false after a successful load, and actions.save works inside it', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/load' ? new Response(JSON.stringify({ nodes: [storedNode], edges: [] })) : new Response(null),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onLoad = vi.fn();
    let saved: Promise<string> | undefined;

    await renderRoot({
      integration: apiIntegration,
      onLoad: (context) => {
        onLoad(context);
        saved = context.actions.save();
      },
    });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: false, loadFailed: false }));
    expect(await saved).toBe('success');
    expect(fetchMock).toHaveBeenCalledWith('/save', expect.objectContaining({ method: 'POST' }));
  });

  it('with the props strategy onLoad fires once with loadFailed false, and actions.save works inside it', async () => {
    const onDataSave = vi.fn(async () => 'success' as const);
    const onLoad = vi.fn();
    let saved: Promise<string> | undefined;

    await renderRoot({
      integration: { strategy: 'props', onDataSave },
      initialNodes: [storedNode],
      onLoad: (context) => {
        onLoad(context);
        saved = context.actions.save();
      },
    });

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: false, loadFailed: false }));
    expect(await saved).toBe('success');
    expect(onDataSave).toHaveBeenCalledOnce();
  });

  it('with the localStorage strategy onLoad gets loadFailed false, and actions.save works inside it', async () => {
    vi.useFakeTimers();
    const onLoad = vi.fn();
    let saved: Promise<string> | undefined;

    await renderRoot({
      onLoad: (context) => {
        onLoad(context);
        saved = context.actions.save();
      },
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ loadFailed: false }));
    expect(await saved).toBe('success');
    expect(localStorage.getItem(localStorageKey)).not.toBeNull();
    vi.useRealTimers();
  });

  it('actions kept from onLoad keep working after the handler returns', async () => {
    let actions!: WorkflowBuilderActions;

    await renderRoot({ onLoad: (context) => ({ actions } = context) });
    act(() => actions.setPaletteOpen(true));

    expect(useStore.getState().isPaletteOpen).toBe(true);
  });

  it('actions kept from an unmounted Root do nothing, and their save never writes the next Root through the old integration', async () => {
    const firstOnDataSave = vi.fn(async () => 'success' as const);
    let kept!: WorkflowBuilderActions;
    const first = await renderRoot({
      integration: { strategy: 'props', onDataSave: firstOnDataSave },
      onLoad: (context) => ({ actions: kept } = context),
    });
    first.unmount();

    await renderRoot({
      integration: { strategy: 'props', onDataSave: vi.fn(async () => 'success' as const) },
      onLoad: () => {},
    });
    act(() => kept.setPaletteOpen(true));

    expect(await kept.save()).toBe('error');
    expect(firstOnDataSave).not.toHaveBeenCalled();
    expect(useStore.getState().isPaletteOpen).toBe(false);
  });

  it('loadData runs once on an empty localStorage start, also under StrictMode', async () => {
    await renderRoot();

    expect(loadData).toHaveBeenCalledOnce();
    expect(useStore.getState().nodes).toEqual([]);
  });

  it('with the api strategy loadData runs once, after the load request settles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ nodes: [storedNode], edges: [] }), { status: 200 })),
    );

    await renderRoot({ integration: apiIntegration });

    expect(loadData).toHaveBeenCalledOnce();
    expect(useStore.getState().nodes.map(({ id }) => id)).toEqual(['stored']);
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

import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type WorkflowBuilderActions, useWorkflowBuilderActions } from '../../hooks/use-workflow-builder-actions';
import type { WorkflowBuilderNode } from '../../node/node-data';
import { saveVariableDefinition } from '../../store/slices/diagram-slice/actions';
import { resetWorkflowStore, useStore } from '../../store/store';
import type { OnSaveExternal } from '../../types/integration';
import { WorkflowBuilderRoot } from '../../workflow-builder-root/workflow-builder-root';
import type { WorkflowBuilderIntegration } from '../../workflow-builder-root/workflow-builder-root.types';
import { trackFutureChange } from '../changes-tracker/stores/use-changes-tracker-store';
import '../i18n/index';
import { SaveButton } from '../integration/components/save-button/save-button';

vi.mock('../../utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

const localStorageKey = 'workflowBuilderDiagram';
const endpoints = { load: '/load', save: '/save' };
const storedNode: WorkflowBuilderNode = {
  id: 'stored',
  position: { x: 0, y: 0 },
  type: 'node',
  data: { type: 'action', icon: 'Plus', properties: {} },
};
const stored = { name: 'Stored', nodes: [storedNode], edges: [] };

type Strategy = 'localStorage' | 'api' | 'props';

type Harness = {
  integration: WorkflowBuilderIntegration;
  writes: () => number;
  failNextWrite: () => void;
};

function harnessFor(strategy: Strategy): Harness {
  if (strategy === 'localStorage') {
    localStorage.setItem(localStorageKey, JSON.stringify(stored));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    return {
      integration: {},
      writes: () => setItem.mock.calls.filter(([key]) => key === localStorageKey).length,
      failNextWrite: () =>
        setItem.mockImplementationOnce(() => {
          throw new Error('QuotaExceededError');
        }),
    };
  }

  if (strategy === 'api') {
    let failNext = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === endpoints.load) return new Response(JSON.stringify(stored), { status: 200 });
      const status = failNext ? 500 : 200;
      failNext = false;
      return new Response(null, { status });
    });
    vi.stubGlobal('fetch', fetchMock);
    return {
      integration: { strategy: 'api', endpoints },
      writes: () => fetchMock.mock.calls.filter(([url]) => url === endpoints.save).length,
      failNextWrite: () => {
        failNext = true;
      },
    };
  }

  const onDataSave = vi.fn<OnSaveExternal>().mockResolvedValue('success');
  return {
    integration: { strategy: 'props', onDataSave },
    writes: () => onDataSave.mock.calls.length,
    failNextWrite: () => onDataSave.mockRejectedValueOnce(new Error('refused')),
  };
}

let actions!: WorkflowBuilderActions;

function ActionsProbe() {
  actions = useWorkflowBuilderActions();
  return null;
}

async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function renderRoot(strategy: Strategy, integration: WorkflowBuilderIntegration) {
  const initialData =
    strategy === 'props' ? { name: stored.name, initialNodes: stored.nodes, initialEdges: stored.edges } : {};
  render(
    <StrictMode>
      <WorkflowBuilderRoot integration={integration} {...initialData}>
        <ActionsProbe />
        <SaveButton />
      </WorkflowBuilderRoot>
    </StrictMode>,
  );
  await settle();
}

async function closeTheTab() {
  await act(async () => {
    globalThis.dispatchEvent(new Event('beforeunload'));
  });
  await settle(800);
}

const edits = {
  'a rename': () => useStore.getState().setWorkflowName('Renamed'),
  'a variable change': () =>
    saveVariableDefinition({ id: 'limit', name: 'limit', type: 'number', defaultValue: '3', description: '' }),
  'a layout direction change': () => useStore.getState().setLayoutDirection('DOWN'),
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  resetWorkflowStore();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each<Strategy>(['localStorage', 'api', 'props'])('automatic saves with the %s strategy', (strategy) => {
  it('opening a diagram and closing the tab without a change writes nothing', async () => {
    const { integration, writes } = harnessFor(strategy);
    await renderRoot(strategy, integration);

    await closeTheTab();

    expect(writes()).toBe(0);
  });

  it('selecting a node, the canvas measuring it and a tracked change with no new data write nothing', async () => {
    const { integration, writes } = harnessFor(strategy);
    await renderRoot(strategy, integration);

    await settle(11_000);
    act(() => {
      useStore.getState().onNodesChange([
        { type: 'select', id: storedNode.id, selected: true },
        { type: 'dimensions', id: storedNode.id, dimensions: { width: 120, height: 40 } },
      ]);
      trackFutureChange('nodeDragStop');
    });
    await settle(400);
    await closeTheTab();

    expect(writes()).toBe(0);
  });

  it.each(Object.entries(edits))('%s alone, then closing the tab, writes once', async (_, edit) => {
    const { integration, writes } = harnessFor(strategy);
    await renderRoot(strategy, integration);

    act(edit);
    await closeTheTab();
    await closeTheTab();

    expect(writes()).toBe(1);
  });

  it('a successful manual save, then closing the tab, writes nothing more', async () => {
    const { integration, writes } = harnessFor(strategy);
    await renderRoot(strategy, integration);

    act(edits['a rename']);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle(800);
    await closeTheTab();

    expect(writes()).toBe(1);
  });

  it('after a failed automatic save the changes stay unsaved, and the next automatic save writes them', async () => {
    const { integration, writes, failNextWrite } = harnessFor(strategy);
    await renderRoot(strategy, integration);

    act(edits['a rename']);
    failNextWrite();
    await closeTheTab();
    await closeTheTab();
    await closeTheTab();

    expect(writes()).toBe(2);
  });

  it('with autoSave: false the editor never writes on its own; the Save button and actions.save() still write', async () => {
    const { integration, writes } = harnessFor(strategy);
    await renderRoot(strategy, { ...integration, autoSave: false });

    await settle(11_000);
    act(() => {
      edits['a rename']();
      trackFutureChange('nodeDragStop');
    });
    await settle(400);
    await closeTheTab();
    expect(writes()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await settle(800);
    expect(writes()).toBe(1);

    act(edits['a layout direction change']);
    act(() => {
      void actions.save();
    });
    await settle(800);
    expect(writes()).toBe(2);
  });
});

describe('an edit made while a save is in flight', () => {
  it('stays unsaved, so closing the tab writes it', async () => {
    let finish!: (status: 'success') => void;
    const onDataSave = vi.fn<OnSaveExternal>(() => new Promise((resolve) => (finish = resolve)));
    await renderRoot('props', { strategy: 'props', onDataSave });

    act(edits['a rename']);
    await closeTheTab();
    act(edits['a layout direction change']);
    await act(async () => finish('success'));
    onDataSave.mockResolvedValue('success');
    await closeTheTab();

    expect(onDataSave).toHaveBeenCalledTimes(2);
    expect(onDataSave.mock.calls[1][0].layoutDirection).toBe('DOWN');
  });
});

describe('two tabs on the default localStorage strategy', () => {
  it('closing the untouched tab does not overwrite the work saved in the other tab', async () => {
    const { integration } = harnessFor('localStorage');
    await renderRoot('localStorage', integration);
    const otherTabWork = JSON.stringify({ ...stored, name: 'Saved in the other tab' });
    localStorage.setItem(localStorageKey, otherTabWork);

    await closeTheTab();

    expect(localStorage.getItem(localStorageKey)).toBe(otherTabWork);
  });
});

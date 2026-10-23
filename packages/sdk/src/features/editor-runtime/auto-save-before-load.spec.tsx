import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetWorkflowStore, useStore } from '../../store/store';
import { WorkflowBuilderRoot } from '../../workflow-builder-root/workflow-builder-root';
import '../i18n/index';

vi.mock('../../utils/show-translated-snackbar', () => ({ showTranslatedSnackbar: vi.fn() }));

const endpoints = { load: '/load', save: '/save' };

type PendingLoad = { resolve: (response: Response) => void };

function stubFetchWithPendingLoad() {
  const pendingLoads: PendingLoad[] = [];
  const fetchMock = vi.fn((url: string) => {
    if (url === endpoints.load) {
      return new Promise<Response>((resolve) => {
        pendingLoads.push({ resolve });
      });
    }
    return Promise.resolve(new Response(null, { status: 200 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, pendingLoads };
}

function savesSent(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url]) => url === endpoints.save);
}

async function renderRoot() {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <StrictMode>
        <WorkflowBuilderRoot integration={{ strategy: 'api', endpoints }}>
          <span />
        </WorkflowBuilderRoot>
      </StrictMode>,
    );
  });
  return view;
}

async function closeTheTab() {
  await act(async () => {
    globalThis.dispatchEvent(new Event('beforeunload'));
  });
}

async function settleLoad(pendingLoads: PendingLoad[]) {
  await act(async () => {
    pendingLoads.at(-1)!.resolve(new Response(JSON.stringify({ nodes: [], edges: [] }), { status: 200 }));
  });
}

beforeEach(() => {
  resetWorkflowStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('auto-save before the initial load settled', () => {
  it('a tab closed while the api load is pending sends nothing; after the load it saves a change', async () => {
    const { fetchMock, pendingLoads } = stubFetchWithPendingLoad();
    await renderRoot();

    await closeTheTab();
    expect(savesSent(fetchMock)).toHaveLength(0);

    await settleLoad(pendingLoads);
    act(() => useStore.getState().setWorkflowName('Changed'));
    await closeTheTab();
    expect(savesSent(fetchMock)).toHaveLength(1);
  });

  it('a second Root mount waits for its own load, although the first one had finished loading', async () => {
    const first = stubFetchWithPendingLoad();
    const view = await renderRoot();
    await settleLoad(first.pendingLoads);
    view.unmount();

    const second = stubFetchWithPendingLoad();
    await renderRoot();

    act(() => useStore.getState().setWorkflowName('Changed'));
    await closeTheTab();
    expect(savesSent(second.fetchMock)).toHaveLength(0);
  });
});
